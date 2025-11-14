const express = require('express');
const router = express.Router();
const { sequelize, Sale, SaleProduct, Product, Batch } = require('../config/db');
const { protect, cajero } = require('../middleware/auth');

// @desc    Crear una nueva venta
// @route   POST /api/sales
// @access  Private/Cajero
router.post('/', protect, cajero, async (req, res) => {
  const { userId, cart, totalAmount, cashReceived, changeGiven } = req.body;

  // Validación básica
  if (!cart || cart.length === 0) {
    return res.status(400).json({ message: 'El carrito está vacío.' });
  }

  const t = await sequelize.transaction();

  try {
    // 1. Crear la venta
    const sale = await Sale.create({
      userId,
      totalAmount,
      cashReceived,
      changeGiven
    }, { transaction: t });

    // 2. Procesar cada producto en el carrito
    for (const item of cart) {
      // Crear el registro en la tabla de unión
      await SaleProduct.create({
        saleId: sale.id,
        productId: item.id,
        quantity: item.quantity,
        unitPrice: item.price,
        totalPrice: item.quantity * item.price
      }, { transaction: t });

      // 3. Descontar el stock de los lotes (Batches)
      let quantityToDecrease = item.quantity;
      const batches = await Batch.findAll({
        where: { productId: item.id },
        order: [['purchaseDate', 'ASC'], ['createdAt', 'ASC']] // FIFO
      });

      for (const batch of batches) {
        if (quantityToDecrease <= 0) break;

        const availableInBatch = batch.quantity;
        if (availableInBatch >= quantityToDecrease) {
          batch.quantity -= quantityToDecrease;
          quantityToDecrease = 0;
          await batch.save({ transaction: t });
        } else {
          quantityToDecrease -= availableInBatch;
          batch.quantity = 0;
          await batch.save({ transaction: t });
        }
      }

      if (quantityToDecrease > 0) {
        // Esto significa que no había suficiente stock
        throw new Error(`Stock insuficiente para el producto: ${item.name}.`);
      }
    }

    // Si todo fue bien, confirmar la transacción
    await t.commit();
    res.status(201).json({ message: 'Venta registrada con éxito', saleId: sale.id });

  } catch (error) {
    // Si algo falló, revertir la transacción
    await t.rollback();
    console.error('Error al registrar la venta:', error);
    res.status(500).json({ message: error.message || 'Error en el servidor al registrar la venta.' });
  }
});

module.exports = router;
