const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { protect, admin, public } = require('../middleware/auth');

// Registro - mostrar formulario
router.get('/register', public, (req, res) => {
  const message = req.query.m;
  res.render('register', { user: req.session.user, message });
});

// Registro - crear usuario (siempre rol user)
router.post('/register', async (req, res) => {
  const { name, email, password } = req.body;
  try {
    const existing = await User.findOne({ where: { email } });
    if (existing) {
      const errorMsg = 'Este correo electrónico ya está registrado. Por favor, utiliza otro correo o inicia sesión.';
      if (req.xhr || req.headers.accept?.indexOf('json') > -1) {
        return res.status(400).json({ success: false, message: errorMsg });
      }
      return res.redirect('/auth/register?m=' + encodeURIComponent(errorMsg));
    }
    
    const newUser = await User.create({ name, email, password, role: 'user' });
    
    // Autologin con sesión
    req.session.user = {
      id: newUser.id,
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
          id: newUser.id,
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
    let errorMessage = 'Error al registrar usuario. Por favor, intenta nuevamente.';
    
    if (err.name === 'SequelizeValidationError') {
      errorMessage = 'Error de validación: ' + err.errors.map(e => e.message).join(', ');
    } else if (err.message) {
      errorMessage = err.message;
    }
    
    if (req.xhr || req.headers.accept?.indexOf('json') > -1) {
      return res.status(500).json({ success: false, message: errorMessage });
    }
    res.redirect('/auth/register?m=' + encodeURIComponent(errorMessage));
  }
});

router.get('/login', public, (req, res) => {
  const message = req.query.m;
  res.render('login', { user: req.session.user, message });
});

router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await User.findOne({ where: { email } });

    const MAX_ATTEMPTS = 3;
    const LOCK_TIME_MS = 20 * 60 * 1000; // 20 minutos

    console.log('Login attempt for:', email);
    console.log('Current loginAttempts:', user ? user.loginAttempts : 'User not found');
    console.log('MAX_ATTEMPTS:', MAX_ATTEMPTS);

    if (user) {
      if (user.lockUntil && user.lockUntil.getTime() <= Date.now()) {
        console.log('User was locked, but lock expired. Resetting attempts.');
        user.loginAttempts = 0;
        user.lockUntil = null;
        await user.save();
      }

      if (user.lockUntil && user.lockUntil.getTime() > Date.now()) {
        const msLeft = user.lockUntil.getTime() - Date.now();
        const minutes = Math.ceil(msLeft / (60 * 1000));
        const lockMsg = `Cuenta bloqueada por ${minutes} min. Intenta más tarde.`;
        console.log('User is still locked.');
        if (req.xhr || req.headers.accept?.indexOf('json') > -1) {
          return res.status(423).json({ success: false, message: lockMsg });
        }
        return res.redirect('/auth/login?m=' + encodeURIComponent(lockMsg));
      }
    }

    if (user && (await user.matchPassword(password))) {
      console.log('Password matched. Successful login.');
      req.session.user = {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role
      };
      if (user.loginAttempts || user.lockUntil) {
        console.log('Resetting login attempts on successful login.');
        user.loginAttempts = 0;
        user.lockUntil = null;
        await user.save();
      }
      
      const token = generateToken(newUser);
      
      res.cookie('token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        maxAge: 24 * 60 * 60 * 1000 // 24 horas
      });
      
      if (req.xhr || req.headers.accept?.indexOf('json') > -1) {
        return res.json({
          success: true,
          token,
          user: {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role
          }
        });
      }
      
      res.redirect('/dashboard');
    } else {
      console.log('Password did not match or user not found.');
      if (user) {
        user.loginAttempts = (user.loginAttempts || 0) + 1;
        console.log('Incremented loginAttempts to:', user.loginAttempts);
        if (user.loginAttempts >= MAX_ATTEMPTS) {
          user.lockUntil = new Date(Date.now() + LOCK_TIME_MS);
          console.log('User locked until:', user.lockUntil);
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
  }
  catch (err) {
    console.error(err);
    let errorMessage = 'Error al iniciar sesión. Por favor, intenta nuevamente.';
    
    if (err.name === 'SequelizeValidationError') {
      errorMessage = 'Error de validación: ' + err.errors.map(e => e.message).join(', ');
    } else if (err.message) {
      errorMessage = err.message;
    }
    
    if (req.xhr || req.headers.accept?.indexOf('json') > -1) {
      return res.status(500).json({ success: false, message: errorMessage });
    }
    res.redirect('/auth/login?m=' + encodeURIComponent(errorMessage));
  }
});

router.get('/logout', (req, res) => {
  req.session.destroy();
  res.clearCookie('token');
  
  if (req.xhr || req.headers.accept?.indexOf('json') > -1) {
    return res.json({ success: true, message: 'Logged out successfully' });
  }
  
  res.redirect('/');
});

// Crear administrador - solo para administradores
router.get('/admin/register', protect, admin, (req, res) => {
  res.render('admin_register', { user: req.session.user });
});

router.post('/admin/register', protect, admin, async (req, res) => {
  const { name, email, password } = req.body;
  try {
    const existing = await User.findOne({ where: { email } });
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