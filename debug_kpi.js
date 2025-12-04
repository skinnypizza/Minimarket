const { Product, Batch, sequelize } = require('./config/db');

async function debugKPIs() {
    try {
        await sequelize.authenticate();
        console.log('Connected to DB');

        const lowStock = await Product.findAll({
            attributes: ['name', 'id'],
            include: ['batches']
        });

        console.log(`Found ${lowStock.length} products`);

        const lowStockData = lowStock.map(p => {
            const stock = p.batches ? p.batches.reduce((sum, b) => sum + b.quantity, 0) : 0;
            return { name: p.name, stock };
        }).filter(p => p.stock < 20)
            .sort((a, b) => a.stock - b.stock)
            .slice(0, 5);

        console.log('Low Stock Data:', JSON.stringify(lowStockData, null, 2));

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await sequelize.close();
    }
}

debugKPIs();
