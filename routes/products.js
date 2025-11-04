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
    req.session.messages = [{ type: 'success', text: 'Producto creado exitosamente.' }];
    res.redirect('/dashboard');
  } catch (err) {
    console.error(err);
    if (err.name === 'ValidationError') {
        const messages = Object.values(err.errors).map(e => ({ type: 'error', text: e.message }));
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
    req.session.messages = [{ type: 'success', text: 'Producto actualizado exitosamente.' }];
    res.redirect('/dashboard');
  } catch (err) {
    console.error(err);
    if (err.name === 'ValidationError') {
        const messages = Object.values(err.errors).map(e => ({ type: 'error', text: e.message }));
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
    await Product.findByIdAndDelete(id);
    req.session.messages = [{ type: 'success', text: 'Producto eliminado exitosamente.' }];
    res.redirect('/dashboard');
  } catch (err) {
    console.error(err);
    req.session.messages = [{ type: 'error', text: 'Error al eliminar el producto.' }];
    res.redirect('/dashboard');
  }
});

// Show edit product page
router.get('/:id/edit', protect, admin, async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
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
