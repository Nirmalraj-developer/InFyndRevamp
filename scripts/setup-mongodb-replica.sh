#!/bin/bash
# MongoDB Replica Set Setup Script (Idempotent)
# Run this after all MongoDB containers are running and reachable.

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

MONGO_ROOT_USER="${MONGO_ROOT_USERNAME:-admin}"
MONGO_ROOT_PASS="${MONGO_ROOT_PASSWORD:-admin123}"

echo "=========================================="
echo "MongoDB Replica Set Setup"
echo "=========================================="

# ── Step 1: Check if replica set is already initialized ──────────────────────
echo "Checking if replica set is already initialized..."
RS_STATUS=$(docker exec mongo-primary mongosh \
    --quiet \
    -u "$MONGO_ROOT_USER" \
    -p "$MONGO_ROOT_PASS" \
    --authenticationDatabase admin \
    --eval "
try {
    var status = rs.status();
    if (status.ok === 1) {
        print('ALREADY_INITIATED');
    } else {
        print('NOT_INITIATED');
    }
} catch(e) {
    if (e.codeName === 'NotYetInitialized') {
        print('NOT_INITIATED');
    } else {
        print('ERROR: ' + e.message);
    }
}" 2>/dev/null | tail -1)

if [ "$RS_STATUS" = "ALREADY_INITIATED" ]; then
    echo -e "${YELLOW}Replica set already initialized — skipping rs.initiate()${NC}"
    echo "Current status:"
    docker exec mongo-primary mongosh \
        --quiet \
        -u "$MONGO_ROOT_USER" \
        -p "$MONGO_ROOT_PASS" \
        --authenticationDatabase admin \
        --eval "rs.status().members.forEach(m => print('  ' + m.name + ' = ' + m.stateStr))" \
        2>/dev/null || true
    echo "=========================================="
    exit 0
fi

echo "Replica set is not yet initialized (status: $RS_STATUS)"
echo ""

# ── Step 2: Verify all members are reachable from mongo-primary ──────────────
echo "Verifying all replica set members are reachable from mongo-primary..."

for MEMBER in mongo-primary mongo-secondary mongo-arbiter; do
    echo -n "  Checking $MEMBER:27017 ... "
    REACHABLE=$(docker exec mongo-primary mongosh \
        --quiet \
        --host "$MEMBER" \
        --port 27017 \
        --eval "db.adminCommand('ping').ok" \
        2>/dev/null | tail -1)

    if [ "$REACHABLE" = "1" ]; then
        echo -e "${GREEN}reachable${NC}"
    else
        echo -e "${RED}NOT reachable${NC}"
        echo -e "${RED}✗ Cannot reach $MEMBER from mongo-primary. Check Docker network.${NC}"
        echo "  DNS resolution test:"
        docker exec mongo-primary bash -c "getent hosts $MEMBER" 2>/dev/null || echo "  (DNS lookup failed)"
        exit 1
    fi
done
echo -e "${GREEN}✓ All members reachable${NC}"
echo ""

# ── Step 3: Initialize replica set ──────────────────────────────────────────
echo "Running rs.initiate()..."
INIT_RESULT=$(docker exec mongo-primary mongosh \
    --quiet \
    -u "$MONGO_ROOT_USER" \
    -p "$MONGO_ROOT_PASS" \
    --authenticationDatabase admin \
    --eval "
var result = rs.initiate({
    _id: 'rs0',
    members: [
        { _id: 0, host: 'mongo-primary:27017',   priority: 2 },
        { _id: 1, host: 'mongo-secondary:27017', priority: 1 },
        { _id: 2, host: 'mongo-arbiter:27017',   arbiterOnly: true }
    ]
});
printjson(result);
" 2>&1)

echo "$INIT_RESULT"

# Check if initiation succeeded
if echo "$INIT_RESULT" | grep -q '"ok" : 1'; then
    echo -e "${GREEN}✓ rs.initiate() succeeded${NC}"
elif echo "$INIT_RESULT" | grep -q "already initialized"; then
    echo -e "${YELLOW}Replica set was already initialized${NC}"
else
    echo -e "${RED}✗ rs.initiate() may have failed — check output above${NC}"
fi

echo ""
echo "=========================================="
echo "MongoDB Replica Set Setup Complete!"
echo "=========================================="
echo ""
echo "rs.initiate() sent. deploy.sh will wait for PRIMARY election."
echo "Application user and indexes will be created after PRIMARY is confirmed."
