require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('../config/db');
const User = require('../models/User');

(async () => {
  await connectDB();
  const email = process.env.ADMIN_EMAIL || 'admin@example.com';
  const exists = await User.findOne({ email });
  if (exists) {
    console.log('Admin already exists:', email);
    process.exit(0);
  }
  const user = await User.create({
    username: process.env.ADMIN_USERNAME || 'SuperAdmin',
    email,
    password: process.env.ADMIN_PASSWORD || 'Admin123!',
    role: 'admin',
    status: 'active'
  });
  console.log('✅ Admin created:', user.email);
  process.exit(0);
})();
