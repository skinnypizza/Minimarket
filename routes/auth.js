const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { protect, admin, public } = require('../middleware/auth');
const { generateToken } = require('../middleware/jwtAuth');

// Registro - mostrar formulario
router.get('/register', public, (req, res) => {
  res.render('register', { user: req.session.user });
});

// Registro - crear usuario (siempre rol user)
router.post('/register', async (req, res) => {
  const { name, email, password } = req.body;
  try {
    const existing = await User.findOne({ email });
    if (existing) {
      if (req.xhr || req.headers.accept?.indexOf('json') > -1) {
        return res.status(400).json({ success: false, message: 'Email already exists' });
      }
      return res.redirect('/auth/register');
    }
    
    const newUser = await User.create({ name, email, password, role: 'user' });
    
    // Autologin con sesión
    req.session.user = {
      id: newUser._id,
      name: newUser.name,
      email: newUser.email,
      role: newUser.role
    };
    
    // Generar JWT token
    const token = generateToken(newUser);
    
    // Establecer cookie con el token
    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 24 * 60 * 60 * 1000 // 24 horas
    });
    
    // Si es una petición AJAX/API, devolver JSON con el token
    if (req.xhr || req.headers.accept?.indexOf('json') > -1) {
      return res.json({
        success: true,
        token,
        user: {
          id: newUser._id,
          name: newUser.name,
          email: newUser.email,
          role: newUser.role
        }
      });
    }
    
    // Si es una petición web normal, redirigir
    res.redirect('/dashboard');
  } catch (err) {
    console.error(err);
    if (req.xhr || req.headers.accept?.indexOf('json') > -1) {
      return res.status(500).json({ success: false, message: 'Server error' });
    }
    res.redirect('/auth/register');
  }
});

router.get('/login', public, (req, res) => {
  const message = req.query.m;
  res.render('login', { user: req.session.user, message });
});

router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await User.findOne({ email });

    // Si el usuario existe, validar estado de bloqueo
    const MAX_ATTEMPTS = 3;
    const LOCK_TIME_MS = 20 * 60 * 1000; // 20 minutos

    if (user) {
      // Si el bloqueo ya expiró, restablecer
      if (user.lockUntil && user.lockUntil.getTime() <= Date.now()) {
        user.loginAttempts = 0;
        user.lockUntil = null;
        await user.save();
      }

      // Si sigue bloqueado, impedir acceso
      if (user.lockUntil && user.lockUntil.getTime() > Date.now()) {
        const msLeft = user.lockUntil.getTime() - Date.now();
        const minutes = Math.ceil(msLeft / (60 * 1000));
        const lockMsg = `Cuenta bloqueada por ${minutes} min. Intenta más tarde.`;
        if (req.xhr || req.headers.accept?.indexOf('json') > -1) {
          return res.status(423).json({ success: false, message: lockMsg });
        }
        return res.redirect('/auth/login?m=' + encodeURIComponent(lockMsg));
      }
    }

    if (user && (await user.matchPassword(password))) {
      // Crear sesión tradicional
      req.session.user = {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role
      };
      // Reiniciar intentos al éxito
      if (user.loginAttempts || user.lockUntil) {
        user.loginAttempts = 0;
        user.lockUntil = null;
        await user.save();
      }
      
      // Generar JWT token
      const token = generateToken(user);
      
      // Establecer cookie con el token
      res.cookie('token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        maxAge: 24 * 60 * 60 * 1000 // 24 horas
      });
      
      // Si es una petición AJAX/API, devolver JSON con el token
      if (req.xhr || req.headers.accept?.indexOf('json') > -1) {
        return res.json({
          success: true,
          token,
          user: {
            id: user._id,
            name: user.name,
            email: user.email,
            role: user.role
          }
        });
      }
      
      // Si es una petición web normal, redirigir
      res.redirect('/dashboard');
    } else {
      // Credenciales inválidas: aumentar intentos y bloquear si corresponde
      if (user) {
        user.loginAttempts = (user.loginAttempts || 0) + 1;
        if (user.loginAttempts >= MAX_ATTEMPTS) {
          user.lockUntil = new Date(Date.now() + LOCK_TIME_MS);
        }
        await user.save();
      }

      const remaining = user ? Math.max(0, MAX_ATTEMPTS - (user.loginAttempts || 0)) : 0;
      if (req.xhr || req.headers.accept?.indexOf('json') > -1) {
        return res.status(401).json({ success: false, message: remaining ? `Credenciales inválidas. Intentos restantes: ${remaining}` : 'Cuenta bloqueada temporalmente.' });
      }
      const msg = remaining ? `Credenciales inválidas. Intentos restantes: ${remaining}` : 'Cuenta bloqueada por 20 min. Intenta más tarde.';
      res.redirect('/auth/login?m=' + encodeURIComponent(msg));
    }
  } catch (err) {
    console.error(err);
    if (req.xhr || req.headers.accept?.indexOf('json') > -1) {
      return res.status(500).json({ success: false, message: 'Server error' });
    }
    res.redirect('/auth/login');
  }
});

router.get('/logout', (req, res) => {
  // Limpiar sesión
  req.session.destroy();
  
  // Limpiar cookie del token
  res.clearCookie('token');
  
  // Si es una petición AJAX/API, devolver JSON
  if (req.xhr || req.headers.accept?.indexOf('json') > -1) {
    return res.json({ success: true, message: 'Logged out successfully' });
  }
  
  // Si es una petición web normal, redirigir
  res.redirect('/');
});

// Crear administrador - solo para administradores
router.get('/admin/register', protect, admin, (req, res) => {
  res.render('admin_register', { user: req.session.user });
});

router.post('/admin/register', protect, admin, async (req, res) => {
  const { name, email, password } = req.body;
  try {
    const existing = await User.findOne({ email });
    if (existing) {
      return res.redirect('/auth/admin/register');
    }
    await User.create({ name, email, password, role: 'admin' });
    res.redirect('/dashboard');
  } catch (err) {
    console.error(err);
    res.redirect('/auth/admin/register');
  }
});

module.exports = router;