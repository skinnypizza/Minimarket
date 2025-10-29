const express = require('express');
const router = express.Router();
const { verifyToken, verifyAdmin } = require('../middleware/jwtAuth');
const Product = require('../models/Product');

// Endpoint de prueba para verificar JWT
router.get('/profile', verifyToken, (req, res) => {
  res.json({
    success: true,
    user: {
      id: req.user._id,
      name: req.user.name,
      email: req.user.email,
      role: req.user.role
    }
  });
});

// Endpoint para obtener productos (requiere autenticación)
router.get('/products', verifyToken, async (req, res) => {
  try {
    const products = await Product.find().sort({ createdAt: -1 });
    res.json({
      success: true,
      products
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener productos'
    });
  }
});

// Endpoint para crear productos (solo admin)
router.post('/products', verifyToken, verifyAdmin, async (req, res) => {
  try {
    const { name, description, price, stock } = req.body;
    const product = await Product.create({
      name,
      description,
      price: Number(price) || 0,
      stock: Number(stock) || 0
    });
    
    res.json({
      success: true,
      product
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Error al crear producto'
    });
  }
});

// Endpoint para agregar al carrito (simulado)
router.post('/cart/add', verifyToken, (req, res) => {
  const { productId, quantity } = req.body;
  
  // Aquí podrías implementar lógica de carrito real
  res.json({
    success: true,
    message: 'Producto agregado al carrito',
    cartItem: {
      productId,
      quantity,
      userId: req.user._id
    }
  });
});

module.exports = router;
