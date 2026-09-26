const { error } = require('../utils/response');

function errorHandler(err, req, res, next) {
  if (err.code === 'LIMIT_FILE_SIZE') {
    return error(res, 'FILE_TOO_LARGE', `File size exceeds the ${process.env.MAX_FILE_SIZE_MB || 50}MB limit.`, 413);
  }

  if (err.code === 'LIMIT_FILE_COUNT') {
    return error(res, 'TOO_MANY_FILES', 'Too many files uploaded at once.', 400);
  }

  if (err.message && err.message.includes('Only CSV, XLS and XLSX')) {
    return error(res, 'INVALID_FILE_TYPE', err.message, 400);
  }

  if (err.type === 'entity.parse.failed') {
    return error(res, 'INVALID_JSON', 'Invalid JSON in request body.', 400);
  }

  const isDev = process.env.NODE_ENV === 'development';

  console.error('[ERROR]', err.stack || err.message || err);

  return error(
    res,
    'INTERNAL_ERROR',
    isDev ? err.message : 'An internal server error occurred.',
    500
  );
}

function notFoundHandler(req, res) {
  return error(res, 'NOT_FOUND', `Route ${req.method} ${req.path} not found.`, 404);
}

module.exports = { errorHandler, notFoundHandler };
