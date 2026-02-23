# Auth Service

Lightweight authentication microservice with OTP-based signup/login flows.

## Features

- **User Registration**: Email-based signup with OTP verification
- **Login**: OTP-based passwordless authentication
- **Token Management**: JWT access/refresh tokens
- **Multi-tenant**: Tenant isolation via Cognito user pools
- **Caching**: Redis-based OTP and user session caching

## Architecture

```
┌─────────────┐
│   Client    │
└──────┬──────┘
       │
┌──────▼──────────────────────────────────────┐
│           Auth Service                       │
│  ┌────────────┐  ┌──────────────┐          │
│  │ Controller │──│   Service    │          │
│  └────────────┘  └──────┬───────┘          │
│                         │                   │
│  ┌──────────────────────▼─────────────┐    │
│  │  Repository  │  Cache  │  Cognito  │    │
│  └──────┬───────┴────┬────┴─────┬─────┘    │
└─────────┼────────────┼──────────┼──────────┘
          │            │          │
     ┌────▼────┐  ┌───▼────┐ ┌──▼──────┐
     │ MongoDB │  │ Redis  │ │  AWS    │
     └─────────┘  └────────┘ │ Cognito │
                              └─────────┘
```

## API Endpoints

### Registration Flow
- `POST /auth/register/initiate` - Start registration, send OTP
- `POST /auth/register/verify` - Verify OTP, activate account
- `POST /auth/resend-registration-otp` - Resend registration OTP

### Login Flow
- `POST /auth/login` - Request login OTP
- `POST /auth/login/verify-otp` - Verify OTP, get tokens
- `POST /auth/login/resend-otp` - Resend login OTP

### Token Management
- `POST /auth/refresh-token` - Refresh access token

## Project Structure

```
src/
├── cache/              # Redis caching layer
│   ├── otp.cache.js
│   └── user.cache.js
├── config/             # Configuration
├── constants/          # Constants & enums
├── container/          # Dependency injection
├── controllers/        # HTTP request handlers
├── kafka/              # Event publishing
├── listeners/          # Event consumers
├── middleware/         # Express middleware
├── models/             # MongoDB schemas
├── repositories/       # Data access layer
├── routes/             # API routes
├── services/           # Business logic
│   ├── auth.service.js
│   ├── cognito.service.js
│   └── tenant.service.js
└── utils/              # Utilities
```

## Memory Optimization

- **Lean Models**: Removed unused fields (creditState, workspace refs)
- **Efficient Caching**: Minimal data stored in Redis
- **Destructured Parameters**: Reduced object creation overhead
- **No Workspace Logic**: Removed all workspace/billing/credit code
- **Projection Queries**: Fetch only required fields from DB

## Environment Variables

```env
# MongoDB
MONGODB_URI=mongodb://mongo-primary:27017,mongo-secondary:27017,mongo-arbiter:27017/infynd?replicaSet=rs0

# Redis
REDIS_HOST=redis
REDIS_PORT=6379

# AWS Cognito
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=<key>
AWS_SECRET_ACCESS_KEY=<secret>

# JWT
JWT_SECRET=<secret>
JWT_ACCESS_EXPIRY=15m
JWT_REFRESH_EXPIRY=7d

# Kafka
KAFKA_BROKERS=kafka1:9092,kafka2:9093,kafka3:9094
```

## Running

```bash
# Development
npm run dev

# Production
npm start
```

## Key Classes

### AuthService
Core business logic for authentication flows. Memory-optimized with minimal dependencies.

### OtpCache
Redis-based OTP storage with automatic expiration. Stores only essential data (otp, email, expiresAt).

### UserRepository
MongoDB data access with projection support to minimize memory footprint.

### CognitoService
AWS Cognito integration for user pool management.

## Flow Diagrams

### Registration
```
Client → POST /register/initiate
  → Create user (pending)
  → Create Cognito user
  → Generate & cache OTP
  → Publish Kafka event (email)
  → Return userId

Client → POST /register/verify
  → Validate OTP
  → Confirm Cognito user
  → Update user (active)
  → Delete OTP
  → Return user data
```

### Login
```
Client → POST /login
  → Find user
  → Generate & cache OTP
  → Publish Kafka event (email)
  → Return success

Client → POST /login/verify-otp
  → Validate OTP
  → Generate JWT tokens
  → Cache refresh token
  → Delete OTP
  → Return tokens + user
```
