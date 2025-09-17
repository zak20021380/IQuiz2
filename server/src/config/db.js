const mongoose = require('mongoose');
const logger = require('./logger');

const connectDB = async () => {
  const uri = process.env.MONGO_URI;
  const maxPoolSize = Number(process.env.MONGO_MAX_POOL || 10);

  let attempts = 0;
  const maxAttempts = 10;

  const connect = async () => {
    try {
      await mongoose.connect(uri, {
        maxPoolSize,
        serverSelectionTimeoutMS: 10000,
        socketTimeoutMS: 45000,
        autoIndex: true
      });
      logger.info('✅ MongoDB connected');
    } catch (err) {
      attempts++;
      const delay = Math.min(30000, 1000 * 2 ** attempts);
      logger.error(`MongoDB connection failed (attempt ${attempts}): ${err.message}. Retrying in ${Math.round(delay/1000)}s`);
      if (attempts < maxAttempts) {
        setTimeout(connect, delay);
      } else {
        logger.error('❌ Could not connect to MongoDB. Exiting.');
        process.exit(1);
      }
    }
  };

  mongoose.connection.on('disconnected', () => logger.warn('⚠️  MongoDB disconnected'));
  mongoose.connection.on('reconnected', () => logger.info('🔁 MongoDB reconnected'));

  await connect();
};

module.exports = connectDB;
