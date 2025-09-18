const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const Admin = require('../models/Admin');
require('dotenv').config();

const createAdmin = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/secure-voting-system', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log('Connected to MongoDB');

    // Check if admin already exists and remove it to recreate
    const existingAdmin = await Admin.findOne({ username: 'admin' });
    if (existingAdmin) {
      console.log('🔄 Removing existing admin account to recreate...');
      await Admin.deleteOne({ username: 'admin' });
      console.log('✅ Old admin account removed');
    }

    // Create new admin with plain password (will be hashed by pre-save hook)
    const admin = new Admin({
      adminId: 'ADMIN001',
      username: 'admin',
      email: 'admin@securevoting.com',
      password: 'admin123', // Plain password - will be hashed automatically
      role: 'super_admin',
      permissions: [
        'create_election',
        'manage_voters', 
        'view_results',
        'audit_votes',
        'manage_candidates'
      ],
      isActive: true
    });

    await admin.save();
    console.log('✅ Admin account created successfully!');
    console.log('📋 Login Credentials:');
    console.log('   Username: admin');
    console.log('   Password: admin123');
    console.log('   Email: admin@securevoting.com');
    console.log('⚠️  IMPORTANT: Change these credentials after first login!');

  } catch (error) {
    console.error('❌ Error creating admin:', error);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
};

createAdmin();
