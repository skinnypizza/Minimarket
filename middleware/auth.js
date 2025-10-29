const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { verifyToken, verifyAdmin } = require('./jwtAuth');

// Middleware para rutas que NO necesitan autenticación
exports.public = (req, res, next) => {
  // Si el usuario ya está autenticado, redirigir al dashboard
  if (req.session.user) {
    return res.redirect('/dashboard');
  }
  next();
};

// Middleware híbrido: soporta tanto sesiones como JWT
exports.protect = async (req, res, next) => {
  try {
    // Primero intentar con JWT
    // Leer token del header o cookie de forma segura
    const authHeader = req.header('Authorization');
    const cookieToken = (req.cookies && req.cookies.token) ? req.cookies.token : undefined;
    let token = authHeader || cookieToken;
    
    if (token) {
      if (token.startsWith('Bearer ')) {
        token = token.slice(7);
      }
      
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findById(decoded.id).select('-password');
        
        if (user) {
          req.user = user;
          req.session.user = {
            id: user._id,
            name: user.name,
            email: user.email,
            role: user.role
          };
          return next();
        }
      } catch (jwtError) {
        // Si JWT falla, continuar con sesión
        console.log('JWT verification failed:', jwtError.message);
      }
    }
    
    // Fallback a sesión tradicional
    if (req.session.user) {
      req.user = req.session.user;
      return next();
    }
    
    // Si es una petición AJAX/API, devolver JSON
    if (req.xhr || req.headers.accept?.indexOf('json') > -1) {
      return res.status(401).json({ message: 'Authentication required' });
    }
    
    // Si es una petición web normal, redirigir a login
    return res.redirect('/auth/login');
  } catch (err) {
    console.error('Auth middleware error:', err);
    if (req.xhr || req.headers.accept?.indexOf('json') > -1) {
      return res.status(500).json({ message: 'Authentication error' });
    }
    return res.redirect('/auth/login');
  }
};

exports.admin = (req, res, next) => {
  const user = req.user || req.session.user;
  
  if (user && user.role === 'admin') {
    next();
  } else {
    if (req.xhr || req.headers.accept?.indexOf('json') > -1) {
      return res.status(403).json({ message: 'Admin access required' });
    }
    return res.redirect('/dashboard');
  }
};