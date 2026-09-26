function success(res, data, statusCode = 200) {
  return res.status(statusCode).json({
    success: true,
    ...data
  });
}

function error(res, code, message, statusCode = 400) {
  return res.status(statusCode).json({
    success: false,
    error: {
      code,
      message
    }
  });
}

function paginate(items, page, limit) {
  const p = Math.max(1, parseInt(page) || 1);
  const l = Math.min(100, Math.max(1, parseInt(limit) || 20));
  const start = (p - 1) * l;
  const end = start + l;
  return {
    page: p,
    limit: l,
    total: items.length,
    totalPages: Math.ceil(items.length / l),
    data: items.slice(start, end)
  };
}

module.exports = { success, error, paginate };
