#!/bin/bash
set -e

echo "Waiting for MongoDB instances to be ready..."
sleep 10

echo "Initiating MongoDB Replica Set..."

mongosh --host mongo-primary:27017 -u "$MONGO_INITDB_ROOT_USERNAME" -p "$MONGO_INITDB_ROOT_PASSWORD" --authenticationDatabase admin <<EOF

rs.initiate({
  _id: "rs0",
  members: [
    { _id: 0, host: "mongo-primary:27017", priority: 2 },
    { _id: 1, host: "mongo-secondary:27017", priority: 1 },
    { _id: 2, host: "mongo-arbiter:27017", arbiterOnly: true }
  ]
});

EOF

echo "Waiting for replica set to stabilize..."
sleep 15

mongosh --host mongo-primary:27017 -u "$MONGO_INITDB_ROOT_USERNAME" -p "$MONGO_INITDB_ROOT_PASSWORD" --authenticationDatabase admin <<EOF

// Check replica set status
rs.status();

// Create application database and user
use infynd;

db.createUser({
  user: "infynd_app",
  pwd: "infynd_app_password",
  roles: [
    { role: "readWrite", db: "infynd" }
  ]
});

// Create indexes for performance
db.users.createIndex({ email: 1, tenantId: 1 }, { unique: true });
db.users.createIndex({ cognitoUserId: 1 });
db.users.createIndex({ tenantId: 1 });
db.tenants.createIndex({ tenantId: 1 }, { unique: true });
db.tenants.createIndex({ hostname: 1 });

print("MongoDB Replica Set initialized successfully!");

EOF

echo "MongoDB Replica Set setup complete!"
