const AppError = require('./app-error');

async function executeWithTimeoutAndRetry(fn, timeoutMs, retryCount = 0) {
  let lastError;
  
  for (let attempt = 0; attempt <= retryCount; attempt++) {
    try {
      return await Promise.race([
        fn(),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Operation timeout')), timeoutMs)
        )
      ]);
    } catch (error) {
      lastError = error;
      if (attempt < retryCount) {
        await new Promise(resolve => setTimeout(resolve, 100 * (attempt + 1)));
      }
    }
  }
  
  throw new AppError(
    'External service temporarily unavailable, please retry',
    'SERVICE_TIMEOUT',
    503
  );
}

module.exports = { executeWithTimeoutAndRetry };
