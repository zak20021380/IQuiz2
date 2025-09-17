require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// ✅ مسیر مدل کاربر را با پروژه‌ی من هماهنگ کن (در صورت تفاوت تغییر بده)
const User = require('../models/User');
// مثال‌های احتمالی دیگر:
// const User = require('../models/users.model');
// const User = require('../models/User');

(async () => {
  try {
    const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/iquiz';
    await mongoose.connect(mongoUri, {});

    const email = process.env.ADMIN_EMAIL || 'admin@example.com';
    const plain = process.env.ADMIN_PASSWORD || 'ChangeThis!123';

    let user = await User.findOne({ email });
    if (user) {
      console.log('✅ Admin already exists:', email);
      process.exit(0);
    }

    const hash = await bcrypt.hash(plain, 12);

    // ⚠️ اگر مدل/فیلدها متفاوت است، این آبجکت را با مدل من هماهنگ کن
    user = await User.create({
      username: 'System Admin',
      name: 'System Admin',
      email,
      password: hash,
      role: 'admin',
      status: 'active',
      isActive: true
    });

    console.log('✅ Admin created:', email);
    console.log('🔐 Password:', plain);
    process.exit(0);
  } catch (err) {
    console.error('❌ Failed to create admin:', err);
    process.exit(1);
  }
})();
