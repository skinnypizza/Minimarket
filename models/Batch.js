const { Model, DataTypes } = require('sequelize');

class Batch extends Model {}

module.exports = (sequelize) => {
  Batch.init({
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
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
    },
    productId: {
      type: DataTypes.INTEGER,
      allowNull: true // Allow null for now, association will handle foreign key constraint
    }
  }, {
    sequelize,
    modelName: 'Batch'
  });
  return Batch;
};