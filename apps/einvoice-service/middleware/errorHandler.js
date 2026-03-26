module.exports = (err, req, res, next) => {
  const status = err.status || 500;
  console.error(`[Error] ${req.method} ${req.path} — ${err.message}`);
  res.status(status).json({
    success: false,
    error:   err.message,
    ...(process.env.NODE_ENV !== 'production' && { stack: err.stack }),
  });
};
