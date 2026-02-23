# Migration Summary: Tenant → HostName & Email → EmailAddress

## Overview
Refactored auth service to use `hostName` from request instead of tenant resolution, and renamed `email` to `emailAddress` throughout the codebase. Added `userId` as a unique identifier field.

---

## Key Changes

### 1. Field Naming Changes

| Old Field | New Field | Description |
|-----------|-----------|-------------|
| `email` | `emailAddress` | More explicit naming |
| `tenantId` | `hostName` | Use hostname for multi-tenancy |
| `_id` (only) | `userId` + `_id` | Added userId as unique string identifier |

---

### 2. User Model Changes

**Before:**
```javascript
{
  email: String,
  tenantId: String (required),
  hostName: String,
  // ...
}

// Indexes
{ email: 1, tenantId: 1 }
{ email: 1, hostName: 1 }
```

**After:**
```javascript
{
  userId: String (required, unique),  // NEW: 32-char hex string
  emailAddress: String (required),
  hostName: String (required),
  // ...
}

// Indexes
{ emailAddress: 1, hostName: 1 } (unique)
{ userId: 1 } (unique)
```

**Benefits:**
- `userId` provides a stable, non-changing identifier
- `hostName` directly identifies the tenant
- Simpler multi-tenant architecture
- No need for tenant resolution middleware

---

### 3. Repository Changes

**UserRepository Methods Updated:**

```javascript
// OLD
findByEmailAndTenant({ email, tenantId })
createRegistrationCandidate({ email, userName, hostName, tenantId })

// NEW
findByEmailAndHostName({ emailAddress, hostName })
findByUserId(userId)  // NEW method
createRegistrationCandidate({ emailAddress, userName, hostName })
generateUserId()  // NEW method - generates 32-char hex
```

---

### 4. Cache Key Changes

**OTP Cache:**
```javascript
// OLD
CACHE_KEYS.REGISTER_OTP(userId, hostName)
CACHE_KEYS.LOGIN_OTP(email, tenantId)

// NEW
CACHE_KEYS.REGISTER_OTP(userId, hostName)
CACHE_KEYS.LOGIN_OTP(emailAddress, hostName)
```

**User Cache:**
```javascript
// OLD
CACHE_KEYS.USER_CACHE(tenantId, email)

// NEW
CACHE_KEYS.USER_CACHE(hostName, emailAddress)
```

---

### 5. Controller Changes

**Request Handling:**

```javascript
// OLD
async registerInitiate(req, res, next) {
  const { email, userName, hostName } = req.body;
  // Uses req.tenant from middleware
  await this.authService.registerInitiate({
    email, userName, hostName,
    tenant: req.tenant
  });
}

// NEW
async registerInitiate(req, res, next) {
  const { emailAddress, userName } = req.body;
  const hostName = req.hostname || req.get('host');  // Extract from request
  await this.authService.registerInitiate({
    emailAddress, userName, hostName
  });
}
```

**All Endpoints Updated:**
- ✅ `/register/initiate`
- ✅ `/register/verify`
- ✅ `/resend-registration-otp`
- ✅ `/login`
- ✅ `/login/verify-otp`
- ✅ `/login/resend-otp`
- ✅ `/refresh-token`

---

### 6. Service Layer Changes

**AuthService Methods:**

All methods now use:
- `emailAddress` instead of `email`
- `hostName` from params (no `tenant` object)
- `userId` for user identification

```javascript
// Example: registerInitiate
async registerInitiate({ emailAddress, userName, hostName, correlationId }) {
  // Check existing user
  const existingUser = await this.userRepository.findByEmailAndHostName(
    { emailAddress, hostName }
  );
  
  // Create user with generated userId
  const user = await this.userRepository.createRegistrationCandidate({
    emailAddress, userName, hostName
  });
  
  const userId = user.userId;  // Use generated userId
  // ...
}
```

---

### 7. Middleware Changes

**Removed:**
- ❌ `tenant-resolver.middleware.js` usage in routes
- ❌ `req.tenant` dependency

**Kept:**
- ✅ `rateLimit.middleware.js`
- ✅ `correlation.middleware.js`
- ✅ `error.middleware.js`
- ✅ `requestValidation.middleware.js`

---

### 8. Routes Changes

```javascript
// OLD
router.post('/register/initiate', 
  authRateLimiter,
  resolveTenant,  // ❌ Removed
  validateRegisterInitiate,
  (req, res, next) => { ... }
);

// NEW
router.post('/register/initiate', 
  authRateLimiter,
  validateRegisterInitiate,
  (req, res, next) => { ... }
);
```

---

## API Request/Response Changes

### Registration Initiate

**Request:**
```json
// OLD
{
  "email": "user@example.com",
  "userName": "John Doe",
  "hostName": "app.infynd.com"
}

// NEW
{
  "emailAddress": "user@example.com",
  "userName": "John Doe"
  // hostName extracted from req.hostname
}
```

**Response:**
```json
{
  "message": "OTP sent successfully",
  "userId": "a1b2c3d4e5f6..."  // 32-char hex string
}
```

### Registration Verify

**Request:**
```json
// OLD
{
  "email": "user@example.com",
  "otp": "123456",
  "hostName": "app.infynd.com"
}

// NEW
{
  "emailAddress": "user@example.com",
  "otp": "123456"
  // hostName extracted from req.hostname
}
```

**Response:**
```json
{
  "message": "Email verified successfully",
  "user": {
    "userId": "a1b2c3d4e5f6...",
    "emailAddress": "user@example.com",
    "userName": "John Doe",
    "status": "active"
  }
}
```

### Login

**Request:**
```json
// OLD
{
  "email": "user@example.com"
}

// NEW
{
  "emailAddress": "user@example.com"
}
```

### Login Verify

**Request:**
```json
// OLD
{
  "email": "user@example.com",
  "otp": "123456"
}

// NEW
{
  "emailAddress": "user@example.com",
  "otp": "123456"
}
```

**Response:**
```json
{
  "message": "Login successful",
  "accessToken": "eyJhbGc...",
  "refreshToken": "eyJhbGc...",
  "user": {
    "userId": "a1b2c3d4e5f6...",
    "emailAddress": "user@example.com",
    "role": "user",
    "hostName": "app.infynd.com",
    "status": "active"
  }
}
```

---

## Database Migration

### Required Steps

1. **Add userId field to existing users:**
```javascript
// Migration script
const crypto = require('crypto');

db.users.find({}).forEach(user => {
  if (!user.userId) {
    db.users.updateOne(
      { _id: user._id },
      { 
        $set: { 
          userId: crypto.randomBytes(16).toString('hex')
        }
      }
    );
  }
});
```

2. **Rename email to emailAddress:**
```javascript
db.users.updateMany(
  {},
  { $rename: { "email": "emailAddress" } }
);
```

3. **Copy tenantId to hostName (if needed):**
```javascript
db.users.find({ hostName: { $exists: false } }).forEach(user => {
  // Map tenantId to hostName based on your tenant config
  const hostName = getTenantHostName(user.tenantId);
  db.users.updateOne(
    { _id: user._id },
    { $set: { hostName: hostName } }
  );
});
```

4. **Remove tenantId field:**
```javascript
db.users.updateMany(
  {},
  { $unset: { "tenantId": "" } }
);
```

5. **Create new indexes:**
```javascript
db.users.createIndex({ userId: 1 }, { unique: true });
db.users.createIndex({ emailAddress: 1, hostName: 1 }, { unique: true });
```

6. **Drop old indexes:**
```javascript
db.users.dropIndex({ email: 1, tenantId: 1 });
db.users.dropIndex({ email: 1, hostName: 1 });
```

---

## Testing Checklist

- [ ] Registration flow with new field names
- [ ] OTP generation and validation
- [ ] Login flow with hostName extraction
- [ ] Token refresh with userId
- [ ] Cache operations with new keys
- [ ] Database queries with new fields
- [ ] Multi-tenant isolation via hostName
- [ ] Existing users can still login (after migration)

---

## Benefits

1. **Simpler Architecture**
   - No tenant resolution middleware needed
   - Direct hostname-based multi-tenancy
   - Fewer dependencies

2. **Better Performance**
   - One less middleware in request chain
   - Direct hostname extraction from request
   - Simpler cache key structure

3. **Clearer Code**
   - `emailAddress` is more explicit than `email`
   - `userId` provides stable identifier
   - `hostName` clearly indicates tenant

4. **Easier Scaling**
   - Hostname-based routing
   - No tenant lookup required
   - Simpler load balancing

---

## Breaking Changes

⚠️ **API Clients Must Update:**

1. Change `email` to `emailAddress` in all requests
2. Remove `hostName` from request body (auto-extracted)
3. Use `userId` instead of `_id` for user identification
4. Update response parsing to use new field names

---

## Rollback Plan

If issues arise:

1. Keep old indexes temporarily
2. Maintain both `email` and `emailAddress` fields during transition
3. Support both field names in API for grace period
4. Gradually migrate clients
5. Remove old fields after full migration

---

## Environment Variables

No changes required. The following remain the same:
- MongoDB connection
- Redis connection
- JWT secrets
- Cognito configuration

---

## Next Steps

1. ✅ Code refactored
2. ⏳ Run database migration
3. ⏳ Update API documentation
4. ⏳ Update client applications
5. ⏳ Deploy to staging
6. ⏳ Test thoroughly
7. ⏳ Deploy to production
8. ⏳ Monitor for issues
