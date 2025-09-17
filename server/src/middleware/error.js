module.exports = (err, req, res, next) => {
  const status = err.statusCode || 500;
  const message = err.message || 'Server error';
  if (process.env.NODE_ENV !== 'test') {
    console.error(err);
  }
  res.status(status).json({ ok:false, message });
};
