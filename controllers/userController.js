const { User } = require('../config/db');

const userController = {
    // Get all users
    getAllUsers: async (req, res) => {
        try {
            const users = await User.findAll({
                attributes: ['id', 'name', 'email', 'role', 'createdAt'],
                order: [['createdAt', 'DESC']]
            });
            res.json({ success: true, users });
        } catch (error) {
            console.error('Error fetching users:', error);
            res.status(500).json({ success: false, message: 'Error al obtener usuarios' });
        }
    },

    // Update user
    updateUser: async (req, res) => {
        try {
            const { id } = req.params;
            const { name, email, role, password } = req.body;

            const user = await User.findByPk(id);
            if (!user) {
                return res.status(404).json({ success: false, message: 'Usuario no encontrado' });
            }

            // Build update object
            const updateData = {};
            if (name) updateData.name = name;
            if (email) updateData.email = email;
            if (role) updateData.role = role;
            if (password) updateData.password = password; // Will be hashed by beforeCreate hook

            await user.update(updateData);

            res.json({ success: true, message: 'Usuario actualizado correctamente', user });
        } catch (error) {
            console.error('Error updating user:', error);
            if (error.name === 'SequelizeUniqueConstraintError') {
                return res.status(400).json({ success: false, message: 'El email ya está en uso' });
            }
            res.status(500).json({ success: false, message: 'Error al actualizar usuario' });
        }
    },

    // Delete user
    deleteUser: async (req, res) => {
        try {
            const { id } = req.params;

            // Prevent deleting yourself
            if (req.user && req.user.id === parseInt(id)) {
                return res.status(400).json({ success: false, message: 'No puedes eliminar tu propio usuario' });
            }

            const user = await User.findByPk(id);
            if (!user) {
                return res.status(404).json({ success: false, message: 'Usuario no encontrado' });
            }

            await user.destroy();

            res.json({ success: true, message: 'Usuario eliminado correctamente' });
        } catch (error) {
            console.error('Error deleting user:', error);
            res.status(500).json({ success: false, message: 'Error al eliminar usuario' });
        }
    }
};

module.exports = userController;
