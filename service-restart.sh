#!/bin/bash
set -euo pipefail

COMPOSE_FILE="docker-compose.production.yml"

echo "=========================================="
echo "Application Service Restart"
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

# Rebuild and restart application services only
docker compose -f "$COMPOSE_FILE" up -d --build \
  auth-service-1 \
  auth-service-2 \
  notification-service-1 \
  notification-service-2 \
  api-gateway-1 \
  api-gateway-2

echo ""
echo "Application services restarted."
