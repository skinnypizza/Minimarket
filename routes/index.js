const express = require('express');
const router = express.Router();
const { protect, admin } = require('../middleware/auth');
const Product = require('../models/Product');

router.get('/', (req, res) => {
  res.render('landing', { user: req.session.user });
});

router.get('/dashboard', protect, (req, res) => {
  // Pass the session user to the templates so `user` is defined in EJS
  if (req.session.user && req.session.user.role === 'admin') {
    // fetch products to show in admin dashboard
    Product.find().sort({ createdAt: -1 }).then(products => {
      res.render('dashboard_admin', { user: req.session.user, products });
    }).catch(err => {
      console.error(err);
      res.render('dashboard_admin', { user: req.session.user, products: [] });
    });
  } else {
    // fetch products to show in user dashboard
    Product.find().sort({ createdAt: -1 }).then(products => {
      res.render('dashboard_user', { user: req.session.user, products });
    }).catch(err => {
      console.error(err);
      res.render('dashboard_user', { user: req.session.user, products: [] });
    });
  }
});

module.exports = router;