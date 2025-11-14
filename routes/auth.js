const express = require('express');
const router = express.Router();
const { User } = require('../config/db');
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
    
    res.redirect('/dashboard');
  } catch (err) {
    console.error(err);
    let errorMessage = 'Error al registrar usuario. Por favor, intenta nuevamente.';
    
    if (err.name === 'SequelizeValidationError') {
      errorMessage = 'Error de validación: ' + err.errors.map(e => e.message).join(', ');
    } else if (err.message) {
      errorMessage = err.message;
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

    const MAX_ATTEMPTS = 5;
    const LOCK_TIME_MS = 15 * 60 * 1000; // 15 minutos

    if (user) {
      if (user.lockUntil && user.lockUntil.getTime() <= Date.now()) {
        user.loginAttempts = 0;
        user.lockUntil = null;
        await user.save();
      }

      if (user.lockUntil && user.lockUntil.getTime() > Date.now()) {
        const msLeft = user.lockUntil.getTime() - Date.now();
        const minutes = Math.ceil(msLeft / (60 * 1000));
        const lockMsg = `Cuenta bloqueada por ${minutes} min. Intenta más tarde.`;
        return res.redirect('/auth/login?m=' + encodeURIComponent(lockMsg));
      }
    }

    if (user && (await user.matchPassword(password))) {
      req.session.user = {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role
      };
      if (user.loginAttempts > 0 || user.lockUntil) {
        user.loginAttempts = 0;
        user.lockUntil = null;
        await user.save();
      }
      
      res.redirect('/dashboard');
    } else {
      if (user) {
        user.loginAttempts = (user.loginAttempts || 0) + 1;
        if (user.loginAttempts >= MAX_ATTEMPTS) {
          user.lockUntil = new Date(Date.now() + LOCK_TIME_MS);
        }
        await user.save();
      }

      const remaining = user ? Math.max(0, MAX_ATTEMPTS - (user.loginAttempts || 0)) : MAX_ATTEMPTS;
      const msg = remaining > 0 ? `Credenciales inválidas. Intentos restantes: ${remaining}` : 'Cuenta bloqueada por 15 min. Intenta más tarde.';
      res.redirect('/auth/login?m=' + encodeURIComponent(msg));
    }
  }
  catch (err) {
    console.error(err);
    const errorMessage = 'Error al iniciar sesión. Por favor, intenta nuevamente.';
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
  const { name, email, password, role } = req.body; // Añadir role
  try {
    const existing = await User.findOne({ where: { email } });
    if (existing) {
      // Idealmente, aquí se debería mostrar un mensaje de error en la vista
      return res.redirect('/auth/admin/register');
    }
    // Usar el rol del formulario, con 'user' como fallback
    await User.create({ name, email, password, role: role || 'user' });
    
    // Añadir mensaje de éxito para mostrar en el dashboard
    req.session.messages = req.session.messages || [];
    req.session.messages.push({ type: 'success', text: '¡Usuario creado exitosamente!' });

    res.redirect('/dashboard#admin-management-section');
  } catch (err) {
    console.error(err);
    req.session.messages = req.session.messages || [];
    req.session.messages.push({ type: 'danger', text: 'Error al crear el usuario.' });
    res.redirect('/auth/admin/register');
  }
});

module.exports = router;