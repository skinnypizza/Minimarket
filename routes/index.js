const express = require('express');
const router = express.Router();
const { protect, admin } = require('../middleware/auth');
const Product = require('../models/Product');
const { Op } = require('sequelize');

router.get('/', (req, res) => {
  res.render('landing', { user: req.session.user });
});

router.get('/dashboard', protect, async (req, res) => {
  try {
    const { search } = req.query;
    const where = {};

    if (search) {
      where.name = { [Op.iLike]: `%${search}%` };
    }

    const products = await Product.findAll({
      where,
      order: [['createdAt', 'DESC']],
      include: 'batches'
    });
    console.log('Products fetched for dashboard:', products.map(p => ({ id: p.id, name: p.name })));

    if (req.session.user && req.session.user.role === 'admin') {
      res.render('dashboard_admin', { user: req.session.user, products, search });
    } else {
      res.render('dashboard_user', { user: req.session.user, products, search });
    }
  } catch (err) {
    console.error(err);
    if (req.session.user && req.session.user.role === 'admin') {
      res.render('dashboard_admin', { user: req.session.user, products: [], search });
    } else {
      res.render('dashboard_user', { user: req.session.user, products: [], search });
    }
  }
});

// Página de prueba para API JWT
router.get('/api-test', protect, (req, res) => {
  res.render('api-test', { user: req.session.user });
});

module.exports = router;