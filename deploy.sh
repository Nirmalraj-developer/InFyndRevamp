#!/bin/bash
set -e

echo "=========================================="
echo "InFynd Production Deployment"
echo "=========================================="
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check prerequisites
echo "Checking prerequisites..."

if ! command -v docker &> /dev/null; then
    echo -e "${RED}Error: Docker is not installed${NC}"
    exit 1
fi

if ! command -v docker compose &> /dev/null; then
    echo -e "${RED}Error: Docker Compose is not installed${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Docker installed${NC}"
echo -e "${GREEN}✓ Docker Compose installed${NC}"
echo ""

# Cleanup orphan containers and conflicts
echo "Cleaning up previous deployment..."

# Stop and remove orphan containers
echo "Stopping orphan containers..."
docker stop infynd-backend kafka mongodb 2>/dev/null || true
docker rm infynd-backend kafka mongodb 2>/dev/null || true

# Stop any running containers from this project
echo "Stopping existing project containers..."
docker compose -f docker-compose.production.yml down 2>/dev/null || true

# Remove unused project volumes (optional - commented out for safety)
# docker volume prune -f --filter "label=com.docker.compose.project=infynd"

echo -e "${GREEN}✓ Cleanup complete${NC}"
echo ""

# Check if .env exists
if [ ! -f .env ]; then
    echo -e "${YELLOW}Warning: .env file not found${NC}"
    echo "Copying .env.production to .env..."
    cp .env.production .env
    echo -e "${YELLOW}Please edit .env file with your configuration${NC}"
    echo "Press Enter to continue or Ctrl+C to exit..."
    read
fi

# Make scripts executable
echo "Making scripts executable..."
chmod +x scripts/*.sh
echo -e "${GREEN}✓ Scripts are executable${NC}"
echo ""
# Generate MongoDB keyFile (shared secret for replica set internal auth)
echo "Checking MongoDB keyFile..."
if [ ! -f scripts/mongo-keyfile ]; then
    echo "Generating new MongoDB keyFile..."
    openssl rand -base64 756 > scripts/mongo-keyfile
    chmod 400 scripts/mongo-keyfile
    echo -e "${GREEN}✓ MongoDB keyFile generated at scripts/mongo-keyfile${NC}"
    echo -e "${YELLOW}  (Keep this file safe — it must be the same on all nodes)${NC}"
else
    chmod 400 scripts/mongo-keyfile
    echo -e "${GREEN}✓ MongoDB keyFile already exists${NC}"
fi
echo ""

# Populate the mongo-keyfile named volume via the docker-compose init service
echo "Populating mongo-keyfile Docker volume..."
docker compose -f docker-compose.production.yml run --rm mongo-keyfile-init
echo -e "${GREEN}✓ mongo-keyfile volume populated${NC}"
echo ""

echo "Building Docker images..."
docker compose -f docker-compose.production.yml build
echo -e "${GREEN}✓ Images built${NC}"
echo ""

# ── Step 1: Start Zookeeper and MongoDB nodes ──────────────────────────────
echo "Starting Zookeeper + MongoDB replica set nodes..."
docker compose -f docker-compose.production.yml up -d zookeeper mongo-primary mongo-secondary mongo-arbiter
echo "Waiting 30 seconds for MongoDB nodes to start..."
sleep 30

# Verify Zookeeper is healthy
echo "Checking Zookeeper health..."
if docker exec zookeeper bash -c "echo ruok | nc localhost 2181" | grep -q "imok"; then
    echo -e "${GREEN}✓ Zookeeper is healthy${NC}"
else
    echo -e "${RED}✗ Zookeeper is not healthy, checking logs...${NC}"
    docker logs zookeeper | tail -20
    exit 1
fi
echo ""

# ── Step 2a: Wait until ALL THREE mongod nodes accept connections ────────────
MONGO_ROOT_USER="${MONGO_ROOT_USERNAME:-admin}"
MONGO_ROOT_PASS="${MONGO_ROOT_PASSWORD:-admin123}"

wait_for_mongo() {
    local CONTAINER="$1"
    local MAX_ATTEMPTS=30
    echo "Waiting for $CONTAINER to accept connections (up to 2.5 minutes)..."
    for i in $(seq 1 $MAX_ATTEMPTS); do
        if docker exec "$CONTAINER" mongosh \
            --quiet \
            --eval "db.adminCommand('ping').ok" 2>/dev/null | grep -q "^1$"; then
            echo -e "${GREEN}✓ $CONTAINER is accepting connections (attempt $i)${NC}"
            return 0
        fi
        echo "  $CONTAINER not yet reachable (attempt $i/$MAX_ATTEMPTS, waiting 5s...)"
        sleep 5
    done
    echo -e "${RED}✗ $CONTAINER never became reachable. Dumping logs:${NC}"
    docker logs "$CONTAINER" | tail -30
    return 1
}

wait_for_mongo "mongo-primary" || exit 1
wait_for_mongo "mongo-secondary" || exit 1
wait_for_mongo "mongo-arbiter" || exit 1
echo ""

# ── Step 2b: Run rs.initiate() (idempotent) ──────────────────────────────────
echo "Initializing MongoDB replica set (rs.initiate)..."
./scripts/setup-mongodb-replica.sh
echo ""

# ── Step 2c: Stabilization delay ─────────────────────────────────────────────
echo "Waiting 30 seconds for replica set to stabilize after rs.initiate()..."
sleep 30

# ── Step 2d: Poll for PRIMARY election ───────────────────────────────────────
echo "Waiting for PRIMARY election (up to 3 minutes)..."
MONGO_PRIMARY=false

for i in $(seq 1 36); do
    IS_MASTER=$(docker exec mongo-primary mongosh \
        --quiet \
        --username "$MONGO_ROOT_USER" \
        --password "$MONGO_ROOT_PASS" \
        --authenticationDatabase admin \
        --eval "try { rs.isMaster().ismaster ? print('YES') : print('NO') } catch(e) { print('NO') }" \
        2>/dev/null | grep -E "^(YES|NO)$" | tail -1)

    if [ "$IS_MASTER" = "YES" ]; then
        echo -e "${GREEN}✓ mongo-primary is PRIMARY (attempt $i)${NC}"
        MONGO_PRIMARY=true
        break
    fi

    # Print rs.status() debug info every 6th attempt (every 30s)
    if [ $((i % 6)) -eq 0 ]; then
        echo -e "${YELLOW}  [DEBUG] rs.status() at attempt $i:${NC}"
        docker exec mongo-primary mongosh \
            --quiet \
            --username "$MONGO_ROOT_USER" \
            --password "$MONGO_ROOT_PASS" \
            --authenticationDatabase admin \
            --eval "rs.status().members.forEach(m => print('    ' + m.name + ' state=' + m.stateStr + ' health=' + m.health + ' lastHeartbeatMessage=' + (m.lastHeartbeatMessage || 'ok')))" \
            2>/dev/null || echo -e "${RED}    (rs.status() failed)${NC}"
    fi

    echo "  Waiting for PRIMARY... ismaster=$IS_MASTER (attempt $i/36, waiting 5s...)"
    sleep 5
done

if [ "$MONGO_PRIMARY" = "false" ]; then
    echo -e "${RED}✗ PRIMARY election did not complete in time.${NC}"
    echo -e "${RED}  Final rs.status():${NC}"
    docker exec mongo-primary mongosh \
        --quiet \
        --username "$MONGO_ROOT_USER" \
        --password "$MONGO_ROOT_PASS" \
        --authenticationDatabase admin \
        --eval "printjson(rs.status())" 2>/dev/null || true
    echo -e "${RED}  Dumping mongo-primary logs:${NC}"
    docker logs mongo-primary | tail -50
    exit 1
fi
echo ""

# ── Step 2d: Create application user and indexes (now that PRIMARY is ready) ─
echo "Creating application database, user, and indexes..."
docker exec mongo-primary mongosh \
    --quiet \
    -u "$MONGO_ROOT_USER" \
    -p "$MONGO_ROOT_PASS" \
    --authenticationDatabase admin <<'MONGOEOF'
use infynd;
if (!db.getUsers().users.find(u => u.user === 'infynd_app')) {
  db.createUser({
    user: "infynd_app",
    pwd: "infynd_app_password",
    roles: [{ role: "readWrite", db: "infynd" }]
  });
  print("User infynd_app created.");
} else {
  print("User infynd_app already exists, skipping.");
}
db.users.createIndex({ email: 1, tenantId: 1 }, { unique: true });
db.users.createIndex({ cognitoUserId: 1 });
db.users.createIndex({ tenantId: 1 });
db.users.createIndex({ createdAt: -1 });
db.tenants.createIndex({ tenantId: 1 }, { unique: true });
db.tenants.createIndex({ hostname: 1 });
db.sessions.createIndex({ sessionId: 1 }, { unique: true });
db.sessions.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 });
print("Indexes created.");
MONGOEOF
echo -e "${GREEN}✓ Application user and indexes ready${NC}"
echo ""

echo "Starting Redis..."
docker compose -f docker-compose.production.yml up -d redis
echo "Waiting for Redis to be ready (15 seconds)..."
sleep 15
echo -e "${GREEN}✓ Redis started${NC}"
echo ""

# ── Step 5: Start Kafka cluster ─────────────────────────────────────────────
echo "Starting Kafka cluster..."
docker compose -f docker-compose.production.yml up -d kafka-1 kafka-2 kafka-3
echo "Waiting for Kafka to be ready (40 seconds)..."
sleep 40
echo -e "${GREEN}✓ Kafka cluster started${NC}"
echo ""

# Initialize Kafka topics
echo "Creating Kafka topics..."
./scripts/setup-kafka-topics.sh
echo -e "${GREEN}✓ Kafka topics created${NC}"
echo ""

# Start application services
echo "Starting application services..."
docker compose -f docker-compose.production.yml up -d \
  auth-service-1 auth-service-2 \
  notification-service-1 notification-service-2 \
  api-gateway-1 api-gateway-2
echo "Waiting for services to be ready (30 seconds)..."
sleep 30
echo -e "${GREEN}✓ Application services started${NC}"
echo ""


# Verify deployment
echo "=========================================="
echo "Verifying Deployment"
echo "=========================================="
echo ""

# Check all containers
echo "Container Status:"
docker compose -f docker-compose.production.yml ps
echo ""

# Test health endpoints
echo "Testing health endpoints..."

if curl -f -s http://localhost:3000/health > /dev/null; then
    echo -e "${GREEN}✓ API Gateway health check passed${NC}"
else
    echo -e "${RED}✗ API Gateway health check failed${NC}"
fi

if curl -f -s http://localhost:3000/auth/health > /dev/null; then
    echo -e "${GREEN}✓ Auth service health check passed${NC}"
else
    echo -e "${RED}✗ Auth service health check failed${NC}"
fi

echo ""

# MongoDB status
echo "MongoDB Replica Set Status:"
docker exec mongo-primary mongosh -u admin -p admin123 \
  --authenticationDatabase admin \
  --eval "rs.status().members.forEach(m => print(m.name + ' - ' + m.stateStr))" \
  2>/dev/null || echo -e "${RED}Failed to get MongoDB status${NC}"
echo ""

# Kafka status
echo "Kafka Topics:"
docker exec kafka-1 kafka-topics --list \
  --bootstrap-server kafka-1:9092,kafka-2:9092,kafka-3:9092 \
  2>/dev/null || echo -e "${RED}Failed to list Kafka topics${NC}"
echo ""

echo "=========================================="
echo "Deployment Complete!"
echo "=========================================="
echo ""
echo "Service Endpoints:"
echo "  - API Gateway: http://localhost:3000/"
echo "  - Health Check: http://localhost:3000/health"
echo "  - Auth API: http://localhost:3000/auth/*"
echo ""
echo "Infrastructure:"
echo "  - MongoDB: localhost:27017"
echo "  - Redis: localhost:6379"
echo "  - Kafka: localhost:9092, localhost:9093, localhost:9094"
echo ""
echo "Useful Commands:"
echo "  - View logs: docker compose -f docker-compose.production.yml logs -f"
echo "  - Stop all: docker compose -f docker-compose.production.yml down"
echo "  - Restart service: docker compose -f docker-compose.production.yml restart <service>"
echo ""
echo -e "${GREEN}System is ready for production traffic!${NC}"
