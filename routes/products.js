const express = require('express');
const router = express.Router();
const Product = require('../models/Product');
const Batch = require('../models/Batch');
const { protect, admin } = require('../middleware/auth');
const upload = require('../middleware/upload');
const { sequelize } = require('../config/db');

// Create a new product (admin only)
router.post('/', protect, admin, upload.single('image'), async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { name, description, price, stock } = req.body;
    const imagePath = req.file ? `/img/products/${req.file.filename}` : null;

    const sellingPrice = Number(price) || 0;
    const initialStock = Number(stock) || 0;

    const product = await Product.create({
      name,
      description,
      price: sellingPrice,
      image: imagePath
    }, { transaction: t });

    await Batch.create({
      quantity: initialStock,
      purchasePrice: sellingPrice * 0.8, // Assume a 20% margin for the initial batch
      purchaseDate: new Date(),
      productId: product.id
    }, { transaction: t });

    await t.commit();
    req.session.messages = [{ type: 'success', text: 'Producto creado exitosamente.' }];
    res.redirect('/dashboard');
  } catch (err) {
    await t.rollback();
    console.error(err);
    if (err.name === 'SequelizeValidationError') {
        const messages = err.errors.map(e => ({ type: 'error', text: e.message }));
        req.session.messages = messages;
    } else {
        req.session.messages = [{ type: 'error', text: 'Error al crear el producto.' }];
    }
    res.redirect('/dashboard');
  }
});

// Update product (admin only)
router.post('/:id/update', protect, admin, upload.single('image'), async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, price } = req.body;
    const imagePath = req.file ? `/img/products/${req.file.filename}` : undefined;

    const updateData = {
      name,
      description,
      price: Number(price) || 0,
    };

    if (imagePath) {
      updateData.image = imagePath;
    }

    await Product.update(updateData, { where: { id } });
    req.session.messages = [{ type: 'success', text: 'Producto actualizado exitosamente.' }];
    res.redirect('/dashboard');
  } catch (err) {
    console.error(err);
    if (err.name === 'SequelizeValidationError') {
        const messages = err.errors.map(e => ({ type: 'error', text: e.message }));
        req.session.messages = messages;
        return res.redirect(`/products/${req.params.id}/edit`);
    } else {
        req.session.messages = [{ type: 'error', text: 'Error al actualizar el producto.' }];
    }
    res.redirect('/dashboard');
  }
});

// Delete product (admin only)
router.post('/:id/delete', protect, admin, async (req, res) => {
  try {
    const { id } = req.params;
    await Product.destroy({ where: { id } });
    res.json({ success: true, message: 'Producto eliminado exitosamente.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Error al eliminar el producto.' });
  }
});

// Show edit product page
router.get('/:id/edit', protect, admin, async (req, res) => {
  try {
    const product = await Product.findByPk(req.params.id, { include: 'batches' });
    console.log('Product fetched for edit:', product ? { id: product.id, name: product.name } : 'Product not found');
    if (!product) {
      req.session.messages = [{ type: 'error', text: 'Producto no encontrado.' }];
      return res.redirect('/dashboard');
    }
    res.render('edit_product', { user: req.session.user, product });
  } catch (err) {
    console.error(err);
    req.session.messages = [{ type: 'error', text: 'Error al cargar la página de edición.' }];
    res.redirect('/dashboard');
  }
});

module.exports = router;