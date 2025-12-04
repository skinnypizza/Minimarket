require('dotenv').config();
const { Product, sequelize } = require('./config/db');

async function listProducts() {
    console.log('DB Config:', {
        host: process.env.DB_HOST,
        database: process.env.DB_NAME,
        port: process.env.DB_PORT
    });

    try {
        await sequelize.authenticate();
        console.log('Connection has been established successfully.');

        const products = await Product.findAll();
        console.log(`Found ${products.length} products:`);
        products.forEach(p => {
            console.log(`- [${p.id}] ${p.name} (Category: ${p.category})`);
        });

    } catch (error) {
        console.error('Unable to connect to the database:', error);
    } finally {
        await sequelize.close();
    }
}

listProducts();
