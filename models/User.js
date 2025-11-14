const { Model, DataTypes } = require('sequelize');
const bcrypt = require('bcryptjs');

class User extends Model {
  async matchPassword(enteredPassword) {
    return await bcrypt.compare(enteredPassword, this.password);
  }
}

module.exports = (sequelize) => {
  User.init({
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false
    },
    email: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true
    },
    password: {
      type: DataTypes.STRING,
      allowNull: false
    },
    role: {
      type: DataTypes.ENUM('user', 'admin', 'inventario', 'cajero'),
      defaultValue: 'user'
    },
    loginAttempts: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    lockUntil: {
      type: DataTypes.DATE,
      defaultValue: null
    }
  }, {
    sequelize,
    modelName: 'User',
    hooks: {
      beforeSave: async (user) => {
        if (user.changed('password')) {
          const password = user.password;

          if (password.length < 8) {
            throw new Error('La contraseña debe tener al menos 8 caracteres');
          }
          if (!/[A-Z]/.test(password)) {
            throw new Error('La contraseña debe contener al menos una letra mayúscula');
          }
          if (!/[a-z]/.test(password)) {
            throw new Error('La contraseña debe contener al menos una letra minúscula');
          }
          if (!/[0-9]/.test(password)) {
            throw new Error('La contraseña debe contener al menos un número');
          }
          if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
            throw new Error('La contraseña debe contener al menos un carácter especial (!@#$%^&*...)');
          }

          const salt = await bcrypt.genSalt(10);
          user.password = await bcrypt.hash(user.password, salt);
        }
      }
    }
  });
  return User;
};