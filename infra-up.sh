#!/bin/bash
set -euo pipefail

COMPOSE_FILE="docker-compose.production.yml"

echo "=========================================="
echo "Infrastructure Bootstrap (Run Once)"
echo "=========================================="
echo ""

if ! command -v docker >/dev/null 2>&1; then
  echo "Error: Docker is not installed"
  exit 1
fi

if ! docker compose version >/dev/null 2>&1; then
  echo "Error: Docker Compose is not installed"
  exit 1
fi

chmod +x scripts/*.sh

# Ensure MongoDB keyfile volume is populated for replica set internal auth
if [ -f scripts/mongo-keyfile ]; then
  docker compose -f "$COMPOSE_FILE" run --rm mongo-keyfile-init
fi

# Start infrastructure services only
docker compose -f "$COMPOSE_FILE" up -d \
  mongo-primary \
  mongo-secondary \
  mongo-arbiter \
  zookeeper \
  kafka-1 \
  kafka-2 \
  kafka-3 \
  redis

# Initialize MongoDB replica set (idempotent)
./scripts/setup-mongodb-replica.sh

# Create Kafka topics (idempotent)
./scripts/setup-kafka-topics.sh

echo ""
echo "Infrastructure is up."
