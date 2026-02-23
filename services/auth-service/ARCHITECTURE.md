# Auth Service - Clean Architecture

## Design Principles

1. **Single Responsibility**: Each class has one clear purpose
2. **Dependency Injection**: Loose coupling via DI container
3. **Memory Efficiency**: Minimal object creation, lean data structures
4. **Separation of Concerns**: Clear layers (Controller → Service → Repository)

## Layer Responsibilities

### Controllers (`src/controllers/`)
- HTTP request/response handling
- Input validation
- Delegate to services
- No business logic

### Services (`src/services/`)
- Business logic implementation
- Orchestrate repositories, caches, external services
- Transaction management
- Error handling

### Repositories (`src/repositories/`)
- Database operations only
- Query optimization with projections
- No business logic
- Return raw data

### Cache (`src/cache/`)
- Redis operations
- TTL management
- Key generation
- Serialization/deserialization

### Models (`src/models/`)
- MongoDB schema definitions
- Indexes
- Validation rules
- No methods (data only)

## Memory Optimization Techniques

### 1. Projection Queries
```javascript
// ❌ Bad: Fetch entire document
const user = await db.collection('users').findOne({ email });

// ✅ Good: Fetch only needed fields
const user = await db.collection('users').findOne(
  { email },
  { projection: { _id: 1, email: 1, status: 1 } }
);
```

### 2. Destructured Parameters
```javascript
// ❌ Bad: Creates intermediate object
async setOtp(params) {
  const { userId, otp } = params;
}

// ✅ Good: Direct destructuring
async setOtp({ userId, otp }) {
  // Use directly
}
```

### 3. Minimal Cache Data
```javascript
// ❌ Bad: Store everything
const cacheData = {
  otp,
  email,
  userName,
  companyName,
  expiresIn,
  expiresAt,
  createdAt
};

// ✅ Good: Store only essentials
const cacheData = {
  otp,
  email,
  expiresAt
};
```

### 4. Lean Models
```javascript
// ❌ Bad: Unused fields
{
  creditState: { ... },
  workspaceRefs: [],
  billingInfo: { ... }
}

// ✅ Good: Only auth-related fields
{
  email,
  userName,
  cognitoUserId,
  status,
  isVerified
}
```

### 5. No Circular References
```javascript
// ❌ Bad: Circular dependency
class AuthService {
  constructor() {
    this.workspaceService = new WorkspaceService(this);
  }
}

// ✅ Good: One-way dependency
class AuthService {
  constructor({ userRepository, otpCache }) {
    this.userRepository = userRepository;
    this.otpCache = otpCache;
  }
}
```

## Class Structure

### AuthService
```javascript
class AuthService {
  constructor(dependencies) {
    // Store only references, no heavy objects
    this.userRepository = dependencies.userRepository;
    this.cognitoService = dependencies.cognitoService;
    this.otpCache = dependencies.otpCache;
    this.userCache = dependencies.userCache;
    this.kafkaPublisher = dependencies.kafkaPublisher;
    this.jwtUtil = dependencies.jwtUtil;
    this.config = dependencies.config;
  }

  // Methods use async/await for non-blocking I/O
  async registerInitiate({ email, userName, tenant }) {
    // 1. Validate
    // 2. Check existence
    // 3. Create user
    // 4. Generate OTP
    // 5. Cache OTP
    // 6. Publish event
    // 7. Return minimal response
  }
}
```

### OtpCache
```javascript
class OtpCache {
  // No constructor state - stateless

  generateOtp() {
    // Pure function
    return crypto.randomInt(100000, 999999).toString();
  }

  async setRegistrationOtp({ userId, hostName, email, otp, expiresInSec }) {
    // Get client per operation (connection pooling)
    const redis = getRedisClient();
    
    // Stringify inline to avoid intermediate object
    const payload = JSON.stringify({
      otp,
      email,
      expiresAt: Date.now() + (expiresInSec * 1000)
    });
    
    // Auto-expire via Redis TTL
    await redis.setEx(key, expiresInSec, payload);
  }
}
```

### UserRepository
```javascript
class UserRepository {
  constructor() {
    this.collectionName = 'users'; // Constant only
  }

  async findByEmailAndTenant({ email, tenantId }, { projection } = {}) {
    const db = getDb(); // Get from pool
    const opts = {};
    if (projection) opts.projection = projection;
    
    // Return raw document, no transformation
    return db.collection(this.collectionName).findOne(
      { email, tenantId },
      opts
    );
  }
}
```

## Dependency Injection Container

```javascript
class DIContainer {
  constructor() {
    this.instances = {}; // Singleton cache
  }

  async setupDependencies() {
    // Create instances once
    this.userRepository = new UserRepository();
    this.otpCache = new OtpCache();
    
    // Inject dependencies
    this.authService = new AuthService({
      userRepository: this.userRepository,
      otpCache: this.otpCache,
      // ... other deps
    });
  }

  getAuthController() {
    // Lazy singleton
    if (!this.instances.authController) {
      this.instances.authController = new AuthController({
        authService: this.authService
      });
    }
    return this.instances.authController;
  }
}
```

## Error Handling

```javascript
class AppError extends Error {
  constructor(message, code, statusCode) {
    super(message);
    this.code = code;
    this.statusCode = statusCode;
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }
}

// Usage
throw new AppError(
  'User not found',
  'USER_NOT_FOUND',
  404
);
```

## Best Practices

1. **Use const for immutability**
2. **Destructure parameters** for clarity
3. **Return early** to reduce nesting
4. **Use projections** in all queries
5. **Cache strategically** (OTP, tokens, not full users)
6. **Fire-and-forget** for non-critical operations (emails)
7. **Timeout & retry** for external services
8. **Log structured data** (JSON)
9. **Validate at boundaries** (controllers)
10. **Keep services stateless**
