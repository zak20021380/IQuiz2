require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('../config/db');
const User = require('../models/User');

(async () => {
  await connectDB();

  // Require all admin credentials from environment variables
  if (!process.env.ADMIN_EMAIL || !process.env.ADMIN_USERNAME || !process.env.ADMIN_PASSWORD) {
    console.error('❌ Error: ADMIN_EMAIL, ADMIN_USERNAME, and ADMIN_PASSWORD must be set in environment variables');
    process.exit(1);
  }

  const email = process.env.ADMIN_EMAIL;
  const exists = await User.findOne({ email });
  if (exists) {
    console.log('Admin already exists:', email);
    process.exit(0);
  }
  const user = await User.create({
    username: process.env.ADMIN_USERNAME,
    email,
    password: process.env.ADMIN_PASSWORD,
    role: 'admin',
    status: 'active'
  });
  console.log('✅ Admin created:', user.email);
  process.exit(0);
})();
