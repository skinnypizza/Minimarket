const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const UserSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  email: {
    type: String,
    required: true,
    unique: true
  },
  password: {
    type: String,
    required: true
  },
  role: {
    type: String,
    enum: ['user', 'admin'],
    default: 'user'
  },
  // Control de bloqueo por intentos fallidos
  loginAttempts: {
    type: Number,
    default: 0
  },
  lockUntil: {
    type: Date,
    default: null
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Validación de política de contraseña
UserSchema.pre('save', async function(next) {
  // Solo validar si la contraseña está siendo modificada y no está hasheada
  if (this.isModified('password')) {
    const password = this.password;
    
    // Verificar si la contraseña ya está hasheada (bcrypt empieza con $2)
    const isHashed = password.startsWith('$2');
    
    // Solo validar si la contraseña no está hasheada (es texto plano)
    if (!isHashed) {
      // Validar longitud mínima
      if (password.length < 8) {
        return next(new Error('La contraseña debe tener al menos 8 caracteres'));
      }
      
      // Validar que tenga mayúsculas
      if (!/[A-Z]/.test(password)) {
        return next(new Error('La contraseña debe contener al menos una letra mayúscula'));
      }
      
      // Validar que tenga minúsculas
      if (!/[a-z]/.test(password)) {
        return next(new Error('La contraseña debe contener al menos una letra minúscula'));
      }
      
      // Validar que tenga números
      if (!/[0-9]/.test(password)) {
        return next(new Error('La contraseña debe contener al menos un número'));
      }
      
      // Validar que tenga caracteres especiales
      if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
        return next(new Error('La contraseña debe contener al menos un carácter especial (!@#$%^&*...)'));
      }
    }
    
    // Cifrar contraseña antes de guardar (solo si no está hasheada)
    if (!isHashed) {
      const salt = await bcrypt.genSalt(10);
      this.password = await bcrypt.hash(password, salt);
    }
  }
  next();
});

// Match password method
UserSchema.methods.matchPassword = async function(enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model('User', UserSchema);