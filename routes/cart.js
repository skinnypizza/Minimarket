const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const Product = require('../models/Product');

// Checkout a cart
router.post('/checkout', protect, async (req, res) => {
    const { cart } = req.body;

    if (!cart || !Array.isArray(cart) || cart.length === 0) {
        return res.status(400).json({ success: false, message: 'El carrito está vacío.' });
    }

    try {
        // Step 1: Validate stock for all products in the cart
        for (const item of cart) {
            const product = await Product.findById(item.id);
            if (!product) {
                return res.status(404).json({ success: false, message: `Producto no encontrado: ${item.name}` });
            }
            if (product.stock < item.quantity) {
                return res.status(400).json({ success: false, message: `Stock insuficiente para ${item.name}. Disponible: ${product.stock}, Solicitado: ${item.quantity}` });
            }
        }

        // Step 2: If stock is sufficient for all items, update the database
        for (const item of cart) {
            await Product.findByIdAndUpdate(item.id, {
                $inc: { stock: -item.quantity }
            });
        }

        res.json({ success: true, message: '¡Compra realizada con éxito!' });

    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Error al procesar la compra.' });
    }
});

module.exports = router;