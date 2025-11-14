const express = require('express');
const router = express.Router();
const { protect, admin, cajero } = require('../middleware/auth');
const { Product, Batch, sequelize, Op } = require('../config/db');

// @desc    Buscar productos para la venta (cajero)
// @route   GET /api/products/search?q=...
// @access  Private/Cajero
router.get('/products/search', protect, cajero, async (req, res) => {
  try {
    const { q } = req.query;
    if (!q) {
      return res.json([]);
    }

    const isNumeric = !isNaN(q);

    const products = await Product.findAll({
      attributes: {
        include: [
          [
            sequelize.literal(`(
              SELECT COALESCE(SUM(quantity), 0)
              FROM "Batches"
              WHERE "Batches"."productId" = "Product".id
            )`),
            'totalStock'
          ]
        ]
      },
      where: {
        [Op.and]: [
          {
            [Op.or]: [
              { name: { [Op.iLike]: `%${q}%` } },
              isNumeric ? { id: parseInt(q, 10) } : null
            ].filter(Boolean)
          },
          sequelize.literal(`(
            SELECT COALESCE(SUM(quantity), 0)
            FROM "Batches"
            WHERE "Batches"."productId" = "Product".id
          ) > 0`)
        ]
      },
      limit: 10
    });

    res.json(products);

  } catch (error) {
    console.error('Error en búsqueda de producto:', error.stack);
    res.status(500).json({ message: 'Error al buscar productos' });
  }
});

// Endpoint de prueba para verificar la autenticación
router.get('/profile', protect, (req, res) => {
  res.json({
    success: true,
    user: {
      id: req.user.id,
      name: req.user.name,
      email: req.user.email,
      role: req.user.role
    }
  });
});

// Endpoint para obtener productos (requiere autenticación)
router.get('/products', protect, async (req, res) => {
  try {
    const products = await Product.findAll({
      order: [['createdAt', 'DESC']],
      include: 'batches'
    });
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
router.post('/products', protect, admin, async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { name, description, price, stock } = req.body;
    
    const product = await Product.create({
      name,
      description,
      price: Number(price) || 0
    }, { transaction: t });

    await Batch.create({
      quantity: Number(stock) || 0,
      purchasePrice: (Number(price) || 0) * 0.8,
      productId: product.id
    }, { transaction: t });

    await t.commit();
    
    const result = await Product.findByPk(product.id, { include: 'batches' });

    res.json({
      success: true,
      product: result
    });
  } catch (error) {
    await t.rollback();
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Error al crear producto'
    });
  }
});

// Endpoint para agregar al carrito (simulado)
router.post('/cart/add', protect, (req, res) => {
  const { productId, quantity } = req.body;
  
  res.json({
    success: true,
    message: 'Producto agregado al carrito',
    cartItem: {
      productId,
      quantity,
      userId: req.user.id
    }
  });
});

module.exports = router;