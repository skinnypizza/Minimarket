const { Model, DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');
const Batch = require('./Batch');

class Product extends Model {
  get totalStock() {
    if (this.batches) {
      return this.batches.reduce((total, batch) => total + batch.quantity, 0);
    }
    return 0;
  }
}

Product.init({
  name: {
    type: DataTypes.STRING,
    allowNull: false,
    trim: true
  },
  description: {
    type: DataTypes.STRING,
    trim: true
  },
  price: { // This is the selling price
    type: DataTypes.FLOAT,
    allowNull: false,
    defaultValue: 0
  },
  image: {
    type: DataTypes.STRING,
    defaultValue: null
  }
}, {
  sequelize,
  modelName: 'Product'
});

Product.hasMany(Batch, { as: 'batches', foreignKey: 'productId' });
Batch.belongsTo(Product, { foreignKey: 'productId' });

module.exports = Product;