require('dotenv').config();
const { sequelize } = require('./config/db');
const User = require('./models/User');
const bcrypt = require('bcryptjs');

async function createAdminUser() {
  try {
    await sequelize.authenticate();
    console.log('PostgreSQL Connected...');

    // Sync models to ensure tables exist
    // This is crucial to ensure the User table is present before querying/creating
    await sequelize.sync({ alter: true });

    const email = 'admin@admin.com';
    const password = 'Admin123*'; // The password provided by the user

    let adminUser = await User.findOne({ where: { email } });

    if (!adminUser) {
      // Hash password before creating user
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(password, salt);

      adminUser = await User.create({
        name: 'Admin',
        email: email,
        password: password, // Pass plain text password
        role: 'admin'
      });
      console.log('Admin user created:', adminUser.email);
    } else {
      console.log('Admin user already exists:', adminUser.email);
      // Always update password if user exists, to ensure it matches the desired one
      const isMatch = await bcrypt.compare(password, adminUser.password);
      if (!isMatch) {
        const salt = await bcrypt.genSalt(10);
        adminUser.password = password; // Pass plain text password
        await adminUser.save();
        console.log('Admin user password updated.');
      } else {
        console.log('Admin user password is already up to date.');
      }
    }
  } catch (err) {
    console.error('Error creating admin user:', err);
  } finally {
    await sequelize.close();
  }
}

createAdminUser();