const { User } = require('./config/db');
const bcrypt = require('bcryptjs');

async function checkAdmin() {
    try {
        const admin = await User.findOne({ where: { email: 'admin@example.com' } });
        if (admin) {
            console.log('Admin user found:', admin.email);
            // Reset password to ensure it's correct
            const salt = await bcrypt.genSalt(10);
            admin.password = await bcrypt.hash('Password123*', salt);
            await admin.save();
            console.log('Admin password reset to: Password123*');
        } else {
            console.log('Admin user NOT found. Creating...');
            await User.create({
                name: 'Admin User',
                email: 'admin@example.com',
                password: 'Password123*',
                role: 'admin'
            });
            console.log('Admin user created.');
        }
    } catch (error) {
        console.error('Error checking admin:', error);
    }
}

checkAdmin();
