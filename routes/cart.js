const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { sequelize } = require('../config/db');

// Get user's active cart
router.get('/my-cart', protect, async (req, res) => {
    try {
        const { Cart, CartItem, Product } = require('../config/db');
        
        let cart = await Cart.findOne({
            where: { 
                userId: req.session.user.id,
                status: 'pending'
            },
            include: [{
                model: CartItem,
                as: 'items',
                include: [{
                    model: Product,
                    as: 'product',
                    include: ['batches']
                }]
            }],
            order: [[{ model: CartItem, as: 'items' }, 'createdAt', 'DESC']]
        });

        res.json({ success: true, cart });
    } catch (err) {
        console.error('Error getting cart:', err);
        res.status(500).json({ success: false, message: 'Error al obtener el carrito.' });
    }
});

// Add/Update cart (create reservation)
router.post('/update', protect, async (req, res) => {
    const { items } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ success: false, message: 'El carrito está vacío.' });
    }

    const t = await sequelize.transaction();

    try {
        const { Cart, CartItem, Product } = require('../config/db');
        
        // Validate all products and stock
        let totalAmount = 0;
        const validatedItems = [];

        for (const item of items) {
            const product = await Product.findByPk(item.productId, { 
                include: ['batches'],
                transaction: t 
            });

            if (!product) {
                await t.rollback();
                return res.status(404).json({ 
                    success: false, 
                    message: `Producto no encontrado: ${item.productId}` 
                });
            }

            if (product.totalStock < item.quantity) {
                await t.rollback();
                return res.status(400).json({ 
                    success: false, 
                    message: `Stock insuficiente para ${product.name}. Disponible: ${product.totalStock}` 
                });
            }

            const itemTotal = product.price * item.quantity;
            totalAmount += itemTotal;

            validatedItems.push({
                productId: product.id,
                quantity: item.quantity,
                unitPrice: product.price,
                totalPrice: itemTotal
            });
        }

        // Find or create pending cart
        let cart = await Cart.findOne({
            where: { 
                userId: req.session.user.id,
                status: 'pending'
            },
            transaction: t
        });

        if (!cart) {
            // Create new cart
            cart = await Cart.create({
                userId: req.session.user.id,
                status: 'pending',
                totalAmount,
                reservationNumber: Cart.generateReservationNumber(),
                expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
            }, { transaction: t });
        } else {
            // Update existing cart
            cart.totalAmount = totalAmount;
            cart.updatedAt = new Date();
            await cart.save({ transaction: t });

            // Delete old items
            await CartItem.destroy({
                where: { cartId: cart.id },
                transaction: t
            });
        }

        // Create cart items
        for (const item of validatedItems) {
            await CartItem.create({
                cartId: cart.id,
                ...item
            }, { transaction: t });
        }

        await t.commit();

        // Return updated cart
        const updatedCart = await Cart.findByPk(cart.id, {
            include: [{
                model: CartItem,
                as: 'items',
                include: [{
                    model: Product,
                    as: 'product'
                }]
            }]
        });

        res.json({ 
            success: true, 
            message: 'Carrito actualizado exitosamente',
            cart: updatedCart
        });

    } catch (err) {
        await t.rollback();
        console.error('Error updating cart:', err);
        res.status(500).json({ success: false, message: 'Error al actualizar el carrito.' });
    }
});

// Cancel cart
router.post('/cancel/:cartId', protect, async (req, res) => {
    try {
        const { Cart } = require('../config/db');
        
        const cart = await Cart.findOne({
            where: { 
                id: req.params.cartId,
                userId: req.session.user.id,
                status: 'pending'
            }
        });

        if (!cart) {
            return res.status(404).json({ success: false, message: 'Carrito no encontrado.' });
        }

        cart.status = 'cancelled';
        await cart.save();

        res.json({ success: true, message: 'Reserva cancelada exitosamente' });
    } catch (err) {
        console.error('Error cancelling cart:', err);
        res.status(500).json({ success: false, message: 'Error al cancelar la reserva.' });
    }
});

// Get user's cart history
router.get('/history', protect, async (req, res) => {
    try {
        const { Cart, CartItem, Product } = require('../config/db');
        
        const carts = await Cart.findAll({
            where: { userId: req.session.user.id },
            include: [{
                model: CartItem,
                as: 'items',
                include: [{
                    model: Product,
                    as: 'product'
                }]
            }],
            order: [['createdAt', 'DESC']],
            limit: 20
        });

        res.json({ success: true, carts });
    } catch (err) {
        console.error('Error getting cart history:', err);
        res.status(500).json({ success: false, message: 'Error al obtener el historial.' });
    }
});

// Get all pending carts (for POS/Admin)
router.get('/all-pending', protect, async (req, res) => {
    try {
        const { Cart, CartItem, Product, User } = require('../config/db');
        
        // Check if user is admin or cajero
        if (req.session.user.role !== 'admin' && req.session.user.role !== 'cajero') {
            return res.status(403).json({ success: false, message: 'No autorizado.' });
        }

        const carts = await Cart.findAll({
            where: { status: 'pending' },
            include: [
                {
                    model: User,
                    as: 'user',
                    attributes: ['id', 'name', 'email']
                },
                {
                    model: CartItem,
                    as: 'items',
                    include: [{
                        model: Product,
                        as: 'product'
                    }]
                }
            ],
            order: [['createdAt', 'DESC']]
        });

        res.json({ success: true, carts });
    } catch (err) {
        console.error('Error getting all carts:', err);
        res.status(500).json({ success: false, message: 'Error al obtener las reservas.' });
    }
});

// Mark cart as completed (when imported to POS)
router.post('/complete/:cartId', protect, async (req, res) => {
    try {
        const { Cart } = require('../config/db');
        
        // Check if user is admin or cajero
        if (req.session.user.role !== 'admin' && req.session.user.role !== 'cajero') {
            return res.status(403).json({ success: false, message: 'No autorizado.' });
        }

        const cart = await Cart.findOne({
            where: { 
                id: req.params.cartId,
                status: 'pending'
            }
        });

        if (!cart) {
            return res.status(404).json({ success: false, message: 'Carrito no encontrado.' });
        }

        cart.status = 'completed';
        cart.completedAt = new Date();
        await cart.save();

        res.json({ success: true, message: 'Reserva marcada como completada' });
    } catch (err) {
        console.error('Error completing cart:', err);
        res.status(500).json({ success: false, message: 'Error al completar la reserva.' });
    }
});

module.exports = router;