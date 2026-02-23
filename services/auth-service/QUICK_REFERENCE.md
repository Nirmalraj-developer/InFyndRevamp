# Auth Service - Quick Reference

## 🚀 Quick Start

```bash
# Install dependencies
npm install

# Set environment variables
cp .env.example .env

# Run development
npm run dev

# Run production
npm start
```

## 📁 File Structure

```
src/
├── cache/              # Redis caching (OTP, user sessions)
├── config/             # App configuration
├── constants/          # Constants & error codes
├── container/          # Dependency injection
├── controllers/        # HTTP handlers
├── kafka/              # Event publishing
├── listeners/          # Event consumers
├── middleware/         # Express middleware
├── models/             # MongoDB schemas
├── repositories/       # Database access
├── routes/             # API routes
├── services/           # Business logic
└── utils/              # Utilities
```

## 🔑 Core Classes

### AuthService
```javascript
// Location: src/services/auth.service.js
// Purpose: Core authentication business logic

Methods:
- registerInitiate()      // Start signup, send OTP
- registerVerify()        // Verify OTP, activate user
- resendRegistrationOtp() // Resend signup OTP
- login()                 // Request login OTP
- verifyLoginOtp()        // Verify OTP, return tokens
- resendLoginOtp()        // Resend login OTP
- refreshToken()          // Refresh access token
```

### OtpCache
```javascript
// Location: src/cache/otp.cache.js
// Purpose: OTP storage in Redis

Methods:
- generateOtp()              // Generate 6-digit OTP
- setRegistrationOtp()       // Store signup OTP
- getRegistrationOtp()       // Retrieve signup OTP
- deleteRegistrationOtp()    // Remove signup OTP
- setLoginOtp()              // Store login OTP
- getLoginOtp()              // Retrieve login OTP
- deleteLoginOtp()           // Remove login OTP
```

### UserRepository
```javascript
// Location: src/repositories/user.repository.js
// Purpose: User database operations

Methods:
- findByEmailAndTenant()        // Find user by email + tenant
- findById()                    // Find user by ID
- createRegistrationCandidate() // Create pending user
- create()                      // Create active user
- markRegistrationVerified()    // Activate user
- updateCognitoSubId()          // Update Cognito ID
```

### CognitoService
```javascript
// Location: src/services/cognito.service.js
// Purpose: AWS Cognito integration

Methods:
- adminCreateUser()      // Create Cognito user
- adminConfirmSignUp()   // Confirm user email
- adminGetUser()         // Get user from Cognito
```

## 🔄 Flow Examples

### Registration Flow
```javascript
// 1. Initiate
POST /auth/register/initiate
Body: { email, userName, companyName, hostName }
→ Creates user (pending)
→ Generates OTP
→ Sends email
→ Returns: { userId, message }

// 2. Verify
POST /auth/register/verify
Body: { email, otp, hostName }
→ Validates OTP
→ Activates user
→ Returns: { user, message }
```

### Login Flow
```javascript
// 1. Request OTP
POST /auth/login
Body: { email }
→ Generates OTP
→ Sends email
→ Returns: { message }

// 2. Verify OTP
POST /auth/login/verify-otp
Body: { email, otp }
→ Validates OTP
→ Generates tokens
→ Returns: { accessToken, refreshToken, user }
```

### Token Refresh
```javascript
POST /auth/refresh-token
Body: { refreshToken }
→ Validates refresh token
→ Generates new access token
→ Returns: { accessToken, user }
```

## 🛠️ Common Tasks

### Add New Validation
```javascript
// Location: src/middleware/requestValidation.middleware.js

const { body } = require('express-validator');

const validateNewEndpoint = [
  body('email').isEmail().normalizeEmail(),
  body('field').notEmpty().trim(),
  // Add more validations
];
```

### Add New Error Code
```javascript
// Location: src/constants/auth.constants.js

ERROR_CODES: {
  NEW_ERROR: 'NEW_ERROR',
  // ...
}

ERROR_MESSAGES: {
  NEW_ERROR: 'Error message here',
  // ...
}
```

### Add New Repository Method
```javascript
// Location: src/repositories/user.repository.js

async newMethod(params, { projection, session } = {}) {
  const db = getDb();
  const opts = {};
  if (projection) opts.projection = projection;
  if (session) opts.session = session;
  
  return db.collection(this.collectionName).findOne(
    { /* query */ },
    opts
  );
}
```

### Add New Cache Method
```javascript
// Location: src/cache/user.cache.js

async newCacheMethod({ key, value, ttl = 300 }) {
  const redis = getRedisClient();
  await redis.setEx(key, ttl, JSON.stringify(value));
}
```

## 🔍 Debugging

### Enable Debug Logs
```bash
# Set in .env
LOG_LEVEL=debug
```

### Check Redis Cache
```bash
# Connect to Redis
docker exec -it redis redis-cli

# List all keys
KEYS *

# Get OTP
GET otp:register:userId:hostname

# Get user cache
GET user:cache:tenantId:email
```

### Check MongoDB
```bash
# Connect to MongoDB
docker exec -it mongo-primary mongosh

# Use database
use infynd

# Find user
db.users.findOne({ email: "test@example.com" })

# Check indexes
db.users.getIndexes()
```

## 📊 Monitoring

### Key Metrics
- OTP generation rate
- OTP validation success rate
- Login success rate
- Token refresh rate
- Cache hit rate
- Database query time

### Health Check
```bash
curl http://localhost:3001/health
```

## 🧪 Testing

### Manual Testing
```bash
# 1. Register
curl -X POST http://localhost/auth/register/initiate \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","userName":"Test","hostName":"app.infynd.com"}'

# 2. Verify (check email for OTP)
curl -X POST http://localhost/auth/register/verify \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","otp":"123456","hostName":"app.infynd.com"}'

# 3. Login
curl -X POST http://localhost/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com"}'

# 4. Verify Login
curl -X POST http://localhost/auth/login/verify-otp \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","otp":"123456"}'
```

## 🔐 Security Best Practices

1. **Never log sensitive data** (OTP, tokens, passwords)
2. **Use projections** to avoid exposing unnecessary fields
3. **Validate all inputs** at controller level
4. **Rate limit** all auth endpoints
5. **Use HTTPS** in production
6. **Rotate JWT secrets** regularly
7. **Set proper CORS** headers
8. **Sanitize MongoDB queries** (express-mongo-sanitize)

## 📝 Code Style

### Naming Conventions
- **Classes**: PascalCase (`AuthService`)
- **Methods**: camelCase (`registerInitiate`)
- **Constants**: UPPER_SNAKE_CASE (`ERROR_CODES`)
- **Files**: kebab-case (`auth.service.js`)

### Method Structure
```javascript
async methodName({ param1, param2 }) {
  // 1. Validate inputs
  if (!param1) throw new AppError(...);
  
  // 2. Fetch data
  const data = await this.repository.find(...);
  
  // 3. Business logic
  const result = processData(data);
  
  // 4. Save/update
  await this.repository.save(result);
  
  // 5. Fire events (fire-and-forget)
  this.kafkaPublisher.publish(...).catch(err => logger.error(...));
  
  // 6. Return minimal response
  return { message: 'Success', data: result };
}
```

## 🚨 Common Issues

### Issue: OTP not received
- Check Kafka consumer is running
- Check email service logs
- Verify Redis connection
- Check OTP expiry time

### Issue: Token invalid
- Check JWT secret matches
- Verify token not expired
- Check refresh token in Redis
- Ensure clock sync (JWT uses timestamps)

### Issue: User not found
- Verify tenant ID matches
- Check MongoDB connection
- Verify user status is 'active'
- Check email is correct

## 📚 Additional Resources

- [README.md](./README.md) - Overview & setup
- [ARCHITECTURE.md](./ARCHITECTURE.md) - Design principles
- [REFACTORING.md](./REFACTORING.md) - What changed
- [API Documentation](./API.md) - Endpoint details (if exists)
