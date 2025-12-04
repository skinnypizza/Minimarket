const express = require('express');
const router = express.Router();
const { protect, admin, adminOrInventario } = require('../middleware/auth');
const upload = require('../middleware/upload');
const productController = require('../controllers/productController');

// Create a new product (admin or inventario)
router.post('/', protect, adminOrInventario, upload.single('image'), productController.createProduct);

// Update product (admin or inventario)
router.post('/:id/update', protect, adminOrInventario, upload.single('image'), productController.updateProduct);

// Delete product (admin or inventario)
router.post('/:id/delete', protect, adminOrInventario, productController.deleteProduct);

// Show edit product page
router.get('/:id/edit', protect, adminOrInventario, productController.getEditProductPage);

// Add batch to product (admin or inventario)
router.post('/:id/batch', protect, adminOrInventario, productController.addBatch);

module.exports = router;