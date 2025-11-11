const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const Product = require('../models/Product');
const Batch = require('../models/Batch');
const { sequelize } = require('../config/db');

// Checkout a cart
router.post('/checkout', protect, async (req, res) => {
    const { cart } = req.body;

    if (!cart || !Array.isArray(cart) || cart.length === 0) {
        return res.status(400).json({ success: false, message: 'El carrito está vacío.' });
    }

    const t = await sequelize.transaction();

    try {
        const productCache = {};

        // Step 1: Validate all items and cache product data
        for (const item of cart) {
            if (typeof item.quantity !== 'number' || !Number.isInteger(item.quantity) || item.quantity <= 0) {
                await t.rollback();
                return res.status(400).json({ success: false, message: `Cantidad inválida para el producto ${item.name || item.id}.` });
            }

            const product = await Product.findByPk(item.id, { include: 'batches', transaction: t });
            if (!product) {
                await t.rollback();
                return res.status(404).json({ success: false, message: `Producto no encontrado: ${item.name || item.id}` });
            }
            if (product.totalStock < item.quantity) {
                await t.rollback();
                return res.status(400).json({ success: false, message: `Stock insuficiente para ${product.name}. Disponible: ${product.totalStock}, Solicitado: ${item.quantity}` });
            }
            productCache[item.id] = product;
        }

        // Step 2: Update the database using cached product data
        for (const item of cart) {
            const product = productCache[item.id]; // Get product from cache
            let quantityToDeduct = item.quantity;

            const sortedBatches = product.batches.sort((a, b) => a.purchaseDate - b.purchaseDate);

            for (const batch of sortedBatches) {
                if (quantityToDeduct <= 0) {
                    break;
                }

                if (batch.quantity >= quantityToDeduct) {
                    batch.quantity -= quantityToDeduct;
                    quantityToDeduct = 0;
                    if (batch.quantity > 0) {
                        await batch.save({ transaction: t });
                    } else {
                        await batch.destroy({ transaction: t });
                    }
                } else {
                    quantityToDeduct -= batch.quantity;
                    await batch.destroy({ transaction: t });
                }
            }
        }

        await t.commit();
        res.json({ success: true, message: '¡Compra realizada con éxito!' });

    } catch (err) {
        await t.rollback();
        console.error(err);
        res.status(500).json({ success: false, message: 'Error al procesar la compra.' });
    }
});

module.exports = router;