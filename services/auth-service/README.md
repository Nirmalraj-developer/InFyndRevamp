# Auth Service

White-label authentication service with JWT and Kafka event publishing.

## Features

- ✅ Multi-tenant (white-label) support via `X-Tenant-Id` header
- ✅ User registration with password hashing (bcrypt)
- ✅ JWT-based authentication (15min expiry)
- ✅ Kafka event publishing on registration
- ✅ Clean service layering (Route → Controller → Service → Repository)
- ✅ MongoDB with tenant-aware unique indexes

## Architecture

```
Route → Controller → Service → Repository → MongoDB
                        ↓
                   Kafka Producer
```

## API Endpoints

### Register

```http
POST /auth/register
X-Tenant-Id: infynd
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "securePassword123"
}
```

**Response (201)**:
```json
{
  "accessToken": "eyJhbGc...",
  "user": {
    "id": "507f1f77bcf86cd799439011",
    "email": "user@example.com",
    "tenantId": "infynd",
    "role": "user",
    "createdAt": "2024-01-15T10:30:00.000Z"
  }
}
```

### Login

```http
POST /auth/login
X-Tenant-Id: infynd
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "securePassword123"
}
```

**Response (200)**:
```json
{
  "accessToken": "eyJhbGc...",
  "user": {
    "id": "507f1f77bcf86cd799439011",
    "email": "user@example.com",
    "tenantId": "infynd",
    "role": "user",
    "createdAt": "2024-01-15T10:30:00.000Z"
  }
}
```

### Health Check

```http
GET /health
```

**Response (200)**:
```json
{
  "status": "OK"
}
```

## JWT Payload

```json
{
  "sub": "507f1f77bcf86cd799439011",
  "tenantId": "infynd",
  "role": "user",
  "iat": 1705315200,
  "exp": 1705316100
}
```

## Kafka Events

### user.registered

Published after successful registration.

**Topic**: `user.registered`  
**Partition Key**: `userId`

```json
{
  "eventId": "uuid",
  "eventType": "user.registered",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "userId": "507f1f77bcf86cd799439011",
  "payload": {
    "userId": "507f1f77bcf86cd799439011",
    "tenantId": "infynd",
    "email": "user@example.com",
    "role": "user"
  },
  "metadata": {
    "source": "auth-service",
    "version": "1.0"
  }
}
```

## Database Schema

### users Collection

```javascript
{
  _id: ObjectId,
  email: String,
  passwordHash: String,
  tenantId: String,
  role: String,
  createdAt: Date
}
```

**Indexes**:
- `{ email: 1, tenantId: 1 }` - UNIQUE

## Environment Variables

```bash
PORT=3001
NODE_ENV=development
MONGODB_URI=mongodb://localhost:27017
KAFKA_BROKERS=localhost:9092
JWT_SECRET=your-secret-key
```

## Running Locally

```bash
# Install dependencies
npm install

# Start service
npm start

# Development mode
npm run dev
```

## Docker

```bash
# Build
docker build -t auth-service .

# Run
docker run -p 3001:3001 \
  -e MONGODB_URI=mongodb://host.docker.internal:27017 \
  -e KAFKA_BROKERS=host.docker.internal:9092 \
  -e JWT_SECRET=your-secret \
  auth-service
```

## White-Label Support

All requests require `X-Tenant-Id` header. Users are isolated by tenant:

- User `user@example.com` in tenant `infynd` is different from `user@example.com` in tenant `acme`
- JWT includes `tenantId` for downstream services
- Database queries always filter by `tenantId`

## Security

- ✅ Passwords hashed with bcrypt (10 rounds)
- ✅ JWT expires in 15 minutes
- ✅ Unique constraint on email per tenant
- ✅ No shared database across services
- ✅ Kafka events published AFTER DB insert

## Future Enhancements

- User Service consumes `user.registered` for profile creation
- Refresh token support
- Password reset flow
- Email verification
- Rate limiting
