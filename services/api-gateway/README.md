# API Gateway Service

Production-grade HTTP proxy middleware for multi-tenant microservices platform.

## Features

- **Hostname Preservation**: Maintains original tenant hostname (tenantA.platform.com)
- **Header Forwarding**: Preserves x-correlation-id, x-tenant-id
- **Multi-Service Routing**: Proxies to auth, notification, export, search services
- **White-label Support**: Enables tenant isolation and Cognito pool mapping

## Routing Map

| Frontend Route | Proxy Target |
|---|---|
| `/auth/*` | `auth-service:3001` |
| `/notifications/*` | `notification-service:3002` |
| `/exports/*` | `export-service:3004` |
| `/search/*` | `search-service:3005` |

## Usage

```bash
# Install dependencies
npm install

# Start service
npm start

# Development mode
npm run dev
```

## Example

Frontend request:
```
POST https://tenantA.platform.com/auth/login
```

Proxied to:
```
POST http://auth-service:3001/auth/login
```

With preserved hostname: `tenantA.platform.com`