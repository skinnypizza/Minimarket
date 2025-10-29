const express = require('express');
const router = express.Router();
const Product = require('../models/Product');
const { protect, admin } = require('../middleware/auth');
const upload = require('../middleware/upload');

// Create a new product (admin only)
router.post('/', protect, admin, upload.single('image'), async (req, res) => {
  try {
    const { name, description, price, stock } = req.body;
    const imagePath = req.file ? `/img/products/${req.file.filename}` : null;
    
    await Product.create({ 
      name, 
      description, 
      price: Number(price) || 0, 
      stock: Number(stock) || 0,
      image: imagePath
    });
    res.redirect('/dashboard');
  } catch (err) {
    console.error(err);
    res.redirect('/dashboard');
  }
});

// Update product (admin only)
router.post('/:id/update', protect, admin, upload.single('image'), async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, price, stock } = req.body;
    const imagePath = req.file ? `/img/products/${req.file.filename}` : undefined;
    
    const updateData = { 
      name, 
      description, 
      price: Number(price) || 0, 
      stock: Number(stock) || 0 
    };
    
    // Solo actualizar la imagen si se subió una nueva
    if (imagePath) {
      updateData.image = imagePath;
    }
    
    await Product.findByIdAndUpdate(id, updateData);
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
