const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Middleware para verificar JWT
exports.verifyToken = async (req, res, next) => {
  try {
    // Obtener token del header Authorization o de las cookies
    let token = req.header('Authorization');
    
    if (!token) {
      // Intentar obtener de las cookies
      token = req.cookies.token;
    }
    
    if (!token) {
      return res.status(401).json({ message: 'No token provided' });
    }

    // Remover 'Bearer ' si está presente
    if (token.startsWith('Bearer ')) {
      token = token.slice(7);
    }

    // Verificar el token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Buscar el usuario en la base de datos
    const user = await User.findById(decoded.id).select('-password');
    
    if (!user) {
      return res.status(401).json({ message: 'User not found' });
    }

    // Agregar el usuario al request
    req.user = user;
    next();
  } catch (error) {
    console.error('JWT Error:', error);
    return res.status(401).json({ message: 'Invalid token' });
  }
};

// Middleware para verificar si es admin
exports.verifyAdmin = (req, res, next) => {
  if (req.user && req.user.role === 'admin') {
    next();
  } else {
    return res.status(403).json({ message: 'Admin access required' });
  }
};

// Generar JWT token
exports.generateToken = (user) => {
  return jwt.sign(
    { 
      id: user._id,
      email: user.email,
      role: user.role 
    },
    process.env.JWT_SECRET,
    { expiresIn: '24h' }
  );
};
