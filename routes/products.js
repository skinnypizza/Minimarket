const express = require('express');
const router = express.Router();
const { protect, admin } = require('../middleware/auth');
const upload = require('../middleware/upload');
const productController = require('../controllers/productController');

// Create a new product (admin only)
router.post('/', protect, admin, upload.single('image'), productController.createProduct);

// Update product (admin only)
router.post('/:id/update', protect, admin, upload.single('image'), productController.updateProduct);

// Delete product (admin only)
router.post('/:id/delete', protect, admin, productController.deleteProduct);

// Show edit product page
router.get('/:id/edit', protect, admin, productController.getEditProductPage);

// Add batch to product (admin only)
router.post('/:id/batch', protect, admin, productController.addBatch);

module.exports = router;