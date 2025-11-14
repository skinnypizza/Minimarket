require('dotenv').config();
const { Sequelize } = require('sequelize');

// --- 1. INICIALIZAR SEQUELIZE ---
const sequelize = new Sequelize(process.env.DB_NAME, process.env.DB_USER, process.env.DB_PASSWORD, {
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  dialect: 'postgres',
  logging: false,
});

const connectDB = async () => {
  try {
    await sequelize.authenticate();
    console.log('PostgreSQL Conectado...');
  } catch (err) {
    console.error('No se pudo conectar a la base de datos:', err);
    process.exit(1);
  }
};

// --- 2. IMPORTAR FUNCIONES DE DEFINICIÓN DE MODELOS ---
const UserModelDefinition = require('../models/User');
const ProductModelDefinition = require('../models/Product');
const BatchModelDefinition = require('../models/Batch');
const SaleModelDefinition = require('../models/Sale');
const SaleProductModelDefinition = require('../models/SaleProduct');

// --- 3. INICIALIZAR MODELOS CON LA INSTANCIA DE SEQUELIZE ---
const User = UserModelDefinition(sequelize);
const Product = ProductModelDefinition(sequelize);
const Batch = BatchModelDefinition(sequelize);
const Sale = SaleModelDefinition(sequelize);
const SaleProduct = SaleProductModelDefinition(sequelize);

// --- 4. DEFINIR ASOCIACIONES ---
// User - Sale (One-to-Many)
User.hasMany(Sale, { foreignKey: 'userId' });
Sale.belongsTo(User, { foreignKey: 'userId' });

// Product - Batch (One-to-Many)
Product.hasMany(Batch, { as: 'batches', foreignKey: 'productId' });
Batch.belongsTo(Product, { foreignKey: 'productId' });

// Sale - Product (Many-to-Many through SaleProduct)
Product.belongsToMany(Sale, {
  through: SaleProduct,
  foreignKey: 'productId',
  otherKey: 'saleId'
});
Sale.belongsToMany(Product, {
  through: SaleProduct,
  foreignKey: 'saleId',
  otherKey: 'productId'
});

// Definir las asociaciones directas para SaleProduct
SaleProduct.belongsTo(Sale, { foreignKey: 'saleId' });
SaleProduct.belongsTo(Product, { foreignKey: 'productId' });


// --- 5. EXPORTAR TODO ---
module.exports = {
  sequelize,
  connectDB,
  User,
  Product,
  Batch,
  Sale,
  SaleProduct,
  Op: Sequelize.Op // Export Sequelize Operators
};