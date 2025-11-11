const { Model, DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

class Batch extends Model {}

Batch.init({
  quantity: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  purchasePrice: {
    type: DataTypes.FLOAT,
    allowNull: false
  },
  purchaseDate: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  }
}, {
  sequelize,
  modelName: 'Batch'
});

module.exports = Batch;