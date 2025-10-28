const mongoose = require('mongoose');
const User = require('./models/User');
const bcrypt = require('bcryptjs');
require('dotenv').config();

async function createUsers() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Conexión exitosa a MongoDB');

        // Verificar si ya existe un admin
        const adminExists = await User.findOne({ email: 'admin@admin.com' });
        
        if (!adminExists) {
            // Crear el usuario administrador
            const adminUser = new User({
                name: 'Administrador',
                email: 'admin@admin.com',
                password: 'admin123',
                role: 'admin'
            });

            await adminUser.save();
            console.log('Usuario administrador creado exitosamente');
            console.log('Email: admin@admin.com');
            console.log('Password: admin123');
        } else {
            console.log('El usuario administrador ya existe');
        }

        // Verificar si ya existe un usuario normal
        const userExists = await User.findOne({ email: 'usuario@usuario.com' });
        
        if (!userExists) {
            // Crear el usuario normal
            const normalUser = new User({
                name: 'Usuario Normal',
                email: 'usuario@usuario.com',
                password: 'usuario123',
                role: 'user'
            });

            await normalUser.save();
            console.log('Usuario normal creado exitosamente');
            console.log('Email: usuario@usuario.com');
            console.log('Password: usuario123');
        } else {
            console.log('El usuario normal ya existe');
        }

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await mongoose.connection.close();
        console.log('Conexión cerrada');
    }
}

createUsers();