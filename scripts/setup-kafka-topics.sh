#!/bin/bash
# Kafka Topics Setup Script
# Run this after Kafka cluster is running

echo "=========================================="
echo "Kafka Topics Setup"
echo "=========================================="

# Wait for Kafka cluster to be ready
echo "Waiting for Kafka cluster to be ready..."
sleep 30

# Create topics with replication
echo "Creating Kafka topics..."

# User registration events
docker exec -it kafka-1 kafka-topics --create \
  --bootstrap-server kafka-1:9092,kafka-2:9092,kafka-3:9092 \
  --topic user.registered \
  --partitions 6 \
  --replication-factor 3 \
  --config min.insync.replicas=2 \
  --config retention.ms=604800000 \
  --config compression.type=snappy

# Login OTP events
docker exec -it kafka-1 kafka-topics --create \
  --bootstrap-server kafka-1:9092,kafka-2:9092,kafka-3:9092 \
  --topic user.login.otp.requested \
  --partitions 6 \
  --replication-factor 3 \
  --config min.insync.replicas=2 \
  --config retention.ms=86400000 \
  --config compression.type=snappy

# Email notification events
docker exec -it kafka-1 kafka-topics --create \
  --bootstrap-server kafka-1:9092,kafka-2:9092,kafka-3:9092 \
  --topic email.notification \
  --partitions 6 \
  --replication-factor 3 \
  --config min.insync.replicas=2 \
  --config retention.ms=604800000 \
  --config compression.type=snappy

# User activity events
docker exec -it kafka-1 kafka-topics --create \
  --bootstrap-server kafka-1:9092,kafka-2:9092,kafka-3:9092 \
  --topic user.activity \
  --partitions 12 \
  --replication-factor 3 \
  --config min.insync.replicas=2 \
  --config retention.ms=2592000000 \
  --config compression.type=snappy

# Dead letter queue
docker exec -it kafka-1 kafka-topics --create \
  --bootstrap-server kafka-1:9092,kafka-2:9092,kafka-3:9092 \
  --topic dlq.failed.events \
  --partitions 3 \
  --replication-factor 3 \
  --config min.insync.replicas=2 \
  --config retention.ms=2592000000

echo ""
echo "Listing all topics..."
docker exec -it kafka-1 kafka-topics --list \
  --bootstrap-server kafka-1:9092,kafka-2:9092,kafka-3:9092

echo ""
echo "Topic details:"
docker exec -it kafka-1 kafka-topics --describe \
  --bootstrap-server kafka-1:9092,kafka-2:9092,kafka-3:9092

echo ""
echo "=========================================="
echo "Kafka Topics Setup Complete!"
echo "=========================================="
echo ""
echo "Topics created:"
echo "  - user.registered (6 partitions, RF=3)"
echo "  - user.login.otp.requested (6 partitions, RF=3)"
echo "  - email.notification (6 partitions, RF=3)"
echo "  - user.activity (12 partitions, RF=3)"
echo "  - dlq.failed.events (3 partitions, RF=3)"
echo ""
echo "Kafka Brokers:"
echo "  - kafka-1:9092"
echo "  - kafka-2:9092"
echo "  - kafka-3:9092"
