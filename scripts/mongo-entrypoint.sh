#!/bin/bash
# mongo-entrypoint.sh
# Wrapper entrypoint that copies the keyFile from the named volume
# into the correct location with proper ownership/permissions,
# then delegates to the official MongoDB docker-entrypoint.sh.
# Runs as root so it can chown the file to the mongodb user (UID 999).

set -e

KEYFILE_SRC="/etc/secrets/mongo-keyfile"
KEYFILE_DST="/etc/mongo-keyfile"

if [ -f "$KEYFILE_SRC" ]; then
    echo "[mongo-entrypoint] Installing keyFile with correct permissions..."
    cp "$KEYFILE_SRC" "$KEYFILE_DST"
    chown 999:999 "$KEYFILE_DST"
    chmod 400 "$KEYFILE_DST"
    echo "[mongo-entrypoint] keyFile installed at $KEYFILE_DST (owner=999:999, mode=400)"
else
    echo "[mongo-entrypoint] ERROR: keyFile not found at $KEYFILE_SRC" >&2
    exit 1
fi

# Hand off to the official MongoDB entrypoint which handles:
#   - MONGO_INITDB_ROOT_USERNAME / PASSWORD user creation
#   - then exec's mongod with the arguments we pass (our CMD)
exec docker-entrypoint.sh "$@"
