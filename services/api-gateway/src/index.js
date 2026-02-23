const express = require('express');
const http = require('http');
const fs = require('fs');
const { createProxyMiddleware, fixRequestBody } = require('http-proxy-middleware');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;
const isContainerRuntime = fs.existsSync('/.dockerenv');

const AUTH_HEALTH_PATH = '/health';
const AUTH_HEALTH_TIMEOUT_MS = 1200;
const AUTH_HEALTH_POLL_MS = 5000;
const AUTH_WAIT_HEALTH_MS = 8000;
const AUTH_PROXY_TIMEOUT_MS = 5000;
const AUTH_UPSTREAM_TIMEOUT_MS = 4000;

const normalizeServiceTargets = (rawValue, fallbackValue) => {
  const source = (rawValue || fallbackValue)
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean);

  const normalized = source
    .map((entry) => {
      try {
        const parsed = new URL(entry);
        const hostname = parsed.hostname.toLowerCase();
        if (isContainerRuntime && (hostname === 'localhost' || hostname === '127.0.0.1')) {
          return null;
        }
        if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
          return null;
        }
        return `${parsed.protocol}//${parsed.host}`;
      } catch (error) {
        return null;
      }
    })
    .filter(Boolean);

  return [...new Set(normalized)];
};

const setProxyHeaders = (proxyReq, req) => {
  proxyReq.setHeader('x-forwarded-host', req.hostname);
  proxyReq.setHeader('x-forwarded-proto', req.protocol);
  if (req.headers['x-correlation-id']) {
    proxyReq.setHeader('x-correlation-id', req.headers['x-correlation-id']);
  }
  if (req.headers['x-tenant-id']) {
    proxyReq.setHeader('x-tenant-id', req.headers['x-tenant-id']);
  }
  fixRequestBody(proxyReq, req);
};

const authTargets = normalizeServiceTargets(
  process.env.AUTH_SERVICE_URL,
  'http://auth-service-1:3001,http://auth-service-2:3001'
);

if (!authTargets.length) {
  throw new Error('[GATEWAY] No valid AUTH service targets found for AUTH_SERVICE_URL');
}

const authHealth = new Map(authTargets.map((target) => [target, { healthy: false, checkedAt: 0 }]));
let authRoundRobinIndex = 0;

const probeAuthTarget = (target) => new Promise((resolve) => {
  const url = new URL(`${target}${AUTH_HEALTH_PATH}`);
  const request = http.request(
    {
      protocol: url.protocol,
      hostname: url.hostname,
      port: url.port,
      path: url.pathname,
      method: 'GET',
      timeout: AUTH_HEALTH_TIMEOUT_MS
    },
    (response) => {
      response.resume();
      resolve(response.statusCode >= 200 && response.statusCode < 500);
    }
  );

  request.on('timeout', () => {
    request.destroy(new Error('timeout'));
  });
  request.on('error', () => resolve(false));
  request.end();
});

const refreshAuthHealth = async () => {
  await Promise.all(authTargets.map(async (target) => {
    const healthy = await probeAuthTarget(target);
    authHealth.set(target, { healthy, checkedAt: Date.now() });
  }));
};

const getAuthTargetPool = () => {
  const healthyTargets = authTargets.filter((target) => authHealth.get(target)?.healthy);
  return healthyTargets.length ? healthyTargets : authTargets;
};

const getOrderedAuthTargets = () => {
  const pool = getAuthTargetPool();
  const start = authRoundRobinIndex % pool.length;
  authRoundRobinIndex = (authRoundRobinIndex + 1) % pool.length;
  return [...pool.slice(start), ...pool.slice(0, start)];
};

const waitForHealthyAuth = async (timeoutMs) => {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (authTargets.some((target) => authHealth.get(target)?.healthy)) {
      return true;
    }
    await refreshAuthHealth();
    if (authTargets.some((target) => authHealth.get(target)?.healthy)) {
      return true;
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  return false;
};

const authProxyByTarget = new Map();

const proxyAuthWithFailover = (req, res) => {
  const state = req._authProxyState;
  const nextTarget = state.targets.find((target) => !state.attempted.has(target));

  if (!nextTarget) {
    if (!res.headersSent) {
      res.status(504).json({
        error: 'Auth service unavailable',
        message: 'All auth upstreams timed out or failed'
      });
    }
    return;
  }

  state.attempted.add(nextTarget);
  req._authCurrentTarget = nextTarget;
  authProxyByTarget.get(nextTarget)(req, res, () => {
    if (!res.headersSent) {
      proxyAuthWithFailover(req, res);
    }
  });
};

for (const target of authTargets) {
  authProxyByTarget.set(
    target,
    createProxyMiddleware({
      target,
      changeOrigin: false,
      xfwd: true,
      proxyTimeout: AUTH_UPSTREAM_TIMEOUT_MS,
      timeout: AUTH_PROXY_TIMEOUT_MS,
      onProxyReq: (proxyReq, req) => setProxyHeaders(proxyReq, req),
      onError: (error, req, res) => {
        console.warn(`[GATEWAY] Auth proxy error for ${req.method} ${req.originalUrl} via ${target}: ${error.message}`);
        if (!res.headersSent) {
          proxyAuthWithFailover(req, res);
        }
      },
      logLevel: 'warn'
    })
  );
}

void refreshAuthHealth();
setInterval(() => {
  void refreshAuthHealth();
}, AUTH_HEALTH_POLL_MS).unref();

// CORS configuration
app.use(cors({
  origin: true,
  credentials: true
}));

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'OK', 
    service: 'api-gateway',
    timestamp: new Date().toISOString()
  });
});

// Proxy configuration for auth-service
app.use('/auth', async (req, res, next) => {
  const hasHealthy = authTargets.some((target) => authHealth.get(target)?.healthy);
  if (!hasHealthy) {
    const ready = await waitForHealthyAuth(AUTH_WAIT_HEALTH_MS);
    if (!ready) {
      return res.status(503).json({
        error: 'Auth service not ready',
        message: 'No healthy auth upstream instance available'
      });
    }
  }

  req._authProxyState = {
    attempted: new Set(),
    targets: getOrderedAuthTargets()
  };
  proxyAuthWithFailover(req, res);
  return undefined;
});

// Proxy configuration for notification-service
app.use('/notifications', createProxyMiddleware({
  target: process.env.NOTIFICATION_SERVICE_URL || 'http://localhost:3002',
  changeOrigin: false,
  xfwd: true,
  onProxyReq: (proxyReq, req) => setProxyHeaders(proxyReq, req),
  logLevel: 'info'
}));

// Proxy configuration for export-service
app.use('/exports', createProxyMiddleware({
  target: process.env.EXPORT_SERVICE_URL || 'http://localhost:3003',
  changeOrigin: false,
  xfwd: true,
  onProxyReq: (proxyReq, req) => setProxyHeaders(proxyReq, req),
  logLevel: 'info'
}));

// Proxy configuration for search-service
app.use('/search', createProxyMiddleware({
  target: 'http://search-service:3005',
  changeOrigin: false,
  xfwd: true,
  onProxyReq: (proxyReq, req) => setProxyHeaders(proxyReq, req),
  logLevel: 'info'
}));

// 404 handler for unmatched routes
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Route not found',
    path: req.originalUrl,
    method: req.method
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('[GATEWAY] Error:', err);
  res.status(500).json({
    error: 'Internal server error',
    message: err.message
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`[GATEWAY] API Gateway running on port ${PORT}`);
  console.log(`[GATEWAY] AUTH targets: ${authTargets.join(', ')}`);
  console.log('[GATEWAY] Proxy routes configured:');
  console.log('  /auth/* → auth-service:3001');
  console.log('  /notifications/* → notification-service:3002');
  console.log('  /exports/* → export-service:3004');
  console.log('  /search/* → search-service:3005');
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('[GATEWAY] Shutting down gracefully...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('[GATEWAY] Shutting down gracefully...');
  process.exit(0);
});
