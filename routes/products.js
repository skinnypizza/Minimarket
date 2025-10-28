const express = require('express');
const router = express.Router();
const Product = require('../models/Product');
const { protect, admin } = require('../middleware/auth');

// Create a new product (admin only)
router.post('/', protect, admin, async (req, res) => {
  try {
    const { name, description, price, stock } = req.body;
    await Product.create({ name, description, price: Number(price) || 0, stock: Number(stock) || 0 });
    res.redirect('/dashboard');
  } catch (err) {
    console.error(err);
    res.redirect('/dashboard');
  }
});

// Update product (admin only)
router.post('/:id/update', protect, admin, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, price, stock } = req.body;
    await Product.findByIdAndUpdate(id, { name, description, price: Number(price) || 0, stock: Number(stock) || 0 });
    res.redirect('/dashboard');
  } catch (err) {
    console.error(err);
    res.redirect('/dashboard');
  }
});

// Delete product (admin only)
router.post('/:id/delete', protect, admin, async (req, res) => {
  try {
    const { id } = req.params;
    await Product.findByIdAndDelete(id);
    res.redirect('/dashboard');
  } catch (err) {
    console.error(err);
    res.redirect('/dashboard');
  }
});

module.exports = router;
