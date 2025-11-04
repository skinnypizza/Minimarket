const express = require('express');
const router = express.Router();
const { protect, admin } = require('../middleware/auth');
const Product = require('../models/Product');

router.get('/', (req, res) => {
  res.render('landing', { user: req.session.user });
});

router.get('/dashboard', protect, (req, res) => {
  const { search } = req.query;
  const query = {};

  if (search) {
    query.name = { $regex: search, $options: 'i' };
  }

  // Pass the session user to the templates so `user` is defined in EJS
  if (req.session.user && req.session.user.role === 'admin') {
    // fetch products to show in admin dashboard
    Product.find(query).sort({ createdAt: -1 }).then(products => {
      res.render('dashboard_admin', { user: req.session.user, products, search });
    }).catch(err => {
      console.error(err);
      res.render('dashboard_admin', { user: req.session.user, products: [], search });
    });
  } else {
    // fetch products to show in user dashboard
    Product.find(query).sort({ createdAt: -1 }).then(products => {
      res.render('dashboard_user', { user: req.session.user, products, search });
    }).catch(err => {
      console.error(err);
      res.render('dashboard_user', { user: req.session.user, products: [], search });
    });
  }
});

// Página de prueba para API JWT
router.get('/api-test', protect, (req, res) => {
  res.render('api-test', { user: req.session.user });
});

module.exports = router;