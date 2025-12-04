const { Product, Batch, sequelize } = require('../config/db');

const productController = {
    // Create a new product
    createProduct: async (req, res) => {
        const t = await sequelize.transaction();
        try {
            const { name, description, price, stock, category } = req.body;
            const imagePath = req.file ? `/img/products/${req.file.filename}` : null;

            // Basic Validation
            if (!name || !price) {
                throw new Error('El nombre y el precio son obligatorios.');
            }

            const sellingPrice = Number(price);
            const initialStock = Number(stock) || 0;

            if (sellingPrice < 0) {
                throw new Error('El precio no puede ser negativo.');
            }

            const product = await Product.create({
                name,
                description,
                price: sellingPrice,
                category: category || 'General',
                image: imagePath
            }, { transaction: t });

            // Create initial batch if stock is provided
            if (initialStock > 0) {
                await Batch.create({
                    quantity: initialStock,
                    purchasePrice: sellingPrice * 0.8, // Assume a 20% margin for the initial batch
                    purchaseDate: new Date(),
                    productId: product.id
                }, { transaction: t });
            }

            console.log('Committing transaction...');
            await t.commit();
            console.log('Transaction committed.');
            req.session.messages = [{ type: 'success', text: 'Producto creado exitosamente.' }];
            res.redirect('/dashboard');
        } catch (err) {
            await t.rollback();
            console.error('Error creating product:', err);

            let errorMessage = 'Error al crear el producto.';
            if (err.name === 'SequelizeValidationError') {
                errorMessage = err.errors.map(e => e.message).join('. ');
            } else if (err.message) {
                errorMessage = err.message;
            }

            req.session.messages = [{ type: 'error', text: errorMessage }];
            res.redirect('/dashboard');
        }
    },

    // Show edit product page
    getEditProductPage: async (req, res) => {
        try {
            const product = await Product.findByPk(req.params.id, { include: 'batches' });

            if (!product) {
                req.session.messages = [{ type: 'error', text: 'Producto no encontrado.' }];
                return res.redirect('/dashboard');
            }

            res.render('edit_product', { user: req.session.user, product });
        } catch (err) {
            console.error('Error fetching product for edit:', err);
            req.session.messages = [{ type: 'error', text: 'Error al cargar la página de edición.' }];
            res.redirect('/dashboard');
        }
    },

    // Update product
    updateProduct: async (req, res) => {
        try {
            const { id } = req.params;
            const { name, description, price } = req.body;
            const imagePath = req.file ? `/img/products/${req.file.filename}` : undefined;

            // Basic Validation
            if (!name || !price) {
                req.session.messages = [{ type: 'error', text: 'El nombre y el precio son obligatorios.' }];
                return res.redirect(`/products/${id}/edit`);
            }

            if (Number(price) < 0) {
                req.session.messages = [{ type: 'error', text: 'El precio no puede ser negativo.' }];
                return res.redirect(`/products/${id}/edit`);
            }

            const updateData = {
                name,
                description,
                price: Number(price),
            };

            if (imagePath) {
                updateData.image = imagePath;
            }

            await Product.update(updateData, { where: { id } });
            req.session.messages = [{ type: 'success', text: 'Producto actualizado exitosamente.' }];
            res.redirect('/dashboard');
        } catch (err) {
            console.error('Error updating product:', err);
            let errorMessage = 'Error al actualizar el producto.';

            if (err.name === 'SequelizeValidationError') {
                errorMessage = err.errors.map(e => e.message).join('. ');
            }

            req.session.messages = [{ type: 'error', text: errorMessage }];
            res.redirect(`/products/${req.params.id}/edit`);
        }
    },

    // Delete product
    deleteProduct: async (req, res) => {
        try {
            const { id } = req.params;
            const deleted = await Product.destroy({ where: { id } });

            if (deleted) {
                res.json({ success: true, message: 'Producto eliminado exitosamente.' });
            } else {
                res.status(404).json({ success: false, message: 'Producto no encontrado.' });
            }
        } catch (err) {
            console.error('Error deleting product:', err);
            res.status(500).json({ success: false, message: 'Error al eliminar el producto.' });
        }
    },

    // Add a new batch to a product
    addBatch: async (req, res) => {
        const t = await sequelize.transaction();
        try {
            const { id } = req.params;
            const { quantity, purchasePrice } = req.body;

            if (!quantity || !purchasePrice) {
                req.session.messages = [{ type: 'error', text: 'Cantidad y precio de compra son obligatorios.' }];
                return res.redirect(`/products/${id}/edit`);
            }

            await Batch.create({
                productId: id,
                quantity: Number(quantity),
                purchasePrice: Number(purchasePrice),
                purchaseDate: new Date()
            }, { transaction: t });

            await t.commit();
            req.session.messages = [{ type: 'success', text: 'Lote agregado exitosamente.' }];
            res.redirect(`/products/${id}/edit`);
        } catch (err) {
            await t.rollback();
            console.error('Error adding batch:', err);
            req.session.messages = [{ type: 'error', text: 'Error al agregar el lote.' }];
            res.redirect(`/products/${req.params.id}/edit`);
        }
    }
};

module.exports = productController;
