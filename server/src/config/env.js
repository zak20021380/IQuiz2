const logger = require('./logger');

const env = {
  nodeEnv: process.env.NODE_ENV || 'development',
  jwt: {
    secret: process.env.JWT_SECRET,
    expiresIn: process.env.JWT_EXPIRES_IN || '7d'
  }
};

if (!env.jwt.secret) {
  if (env.nodeEnv === 'production') {
    throw new Error('JWT_SECRET environment variable is required in production');
  }
  env.jwt.secret = 'development-only-jwt-secret-change-me';
  logger.warn('JWT_SECRET environment variable is not set. Using an insecure fallback secret for development.');
}

module.exports = Object.freeze(env);
