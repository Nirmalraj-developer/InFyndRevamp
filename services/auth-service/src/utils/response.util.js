function sendSuccess(res, params) {
  const { data, message, statusCode = 200, correlationId } = params;
  
  return res.status(statusCode).json({
    success: true,
    data,
    message,
    correlationId
  });
}

function sendError(res, params) {
  const { code, message, statusCode = 500, correlationId } = params;
  
  return res.status(statusCode).json({
    success: false,
    error: {
      code,
      message
    },
    correlationId
  });
}

module.exports = { sendSuccess, sendError };
