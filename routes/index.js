const express = require('express');
const router = express.Router();
const { protect, admin, cajero, inventario, adminOrInventario } = require('../middleware/auth');
const { Product, User, sequelize } = require('../config/db');
const { Op } = require('sequelize');

// Landing page
router.get('/', (req, res) => {
  // Si el usuario está logueado, redirigir al dashboard, si no, a la landing.
  if (req.session.user) {
    return res.redirect('/dashboard');
  }
  res.render('landing', { user: null });
});

// --- DASHBOARD ROUTER ---
// Redirige al dashboard correspondiente según el rol del usuario
router.get('/dashboard', protect, (req, res) => {
  const user = req.session.user;
  switch (user.role) {
    case 'admin':
      res.redirect('/dashboard/admin');
      break;
    case 'cajero':
      res.redirect('/dashboard/cajero');
      break;
    case 'inventario':
      res.redirect('/dashboard/inventario');
      break;
    case 'user':
    default:
      res.redirect('/dashboard/user');
      break;
  }
});

// --- ADMIN DASHBOARD ---
router.get('/dashboard/admin', protect, admin, async (req, res) => {
  try {
    const users = await User.findAll({ where: { role: { [Op.ne]: 'admin' } } });
    const products = await Product.findAll({ include: 'batches', order: [['name', 'ASC']] });
    res.render('dashboard_admin', { 
      user: req.session.user,
      users,
      products,
      search: '' 
    });
  } catch (err) {
    console.error(err);
    res.status(500).send("Error al cargar el dashboard del administrador");
  }
});

// --- INVENTARIO DASHBOARD ---
router.get('/dashboard/inventario', protect, adminOrInventario, async (req, res) => {
  try {
    const products = await Product.findAll({ include: 'batches', order: [['name', 'ASC']] });
    res.render('dashboard_inventario', { 
      user: req.session.user,
      products,
      search: ''
    });
  } catch (err) {
    console.error(err);
    res.status(500).send("Error al cargar el dashboard de inventario");
  }
});

// --- CAJERO DASHBOARD ---
router.get('/dashboard/cajero', protect, cajero, (req, res) => {
  res.render('dashboard_cajero', { user: req.session.user });
});

// --- USER DASHBOARD ---
router.get('/dashboard/user', protect, async (req, res) => {
  try {
    const products = await Product.findAll({ order: [['name', 'ASC']] });
    res.render('dashboard_user', { 
      user: req.session.user,
      products,
      search: ''
    });
  } catch (err) {
    console.error(err);
    res.status(500).send("Error al cargar el dashboard de usuario");
  }
});


// Página de prueba para API JWT
router.get('/api-test', protect, (req, res) => {
  res.render('api-test', { user: req.session.user });
});

module.exports = router;