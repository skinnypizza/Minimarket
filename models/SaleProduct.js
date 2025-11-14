const { Model, DataTypes } = require('sequelize');

class SaleProduct extends Model {}

module.exports = (sequelize) => {
  SaleProduct.init({
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    saleId: {
      type: DataTypes.INTEGER
      // La referencia se establecerá en el archivo de asociaciones central
    },
    productId: {
      type: DataTypes.INTEGER
      // La referencia se establecerá en el archivo de asociaciones central
    },
    quantity: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    unitPrice: {
      type: DataTypes.DOUBLE,
      allowNull: false
    },
    totalPrice: {
      type: DataTypes.DOUBLE,
      allowNull: false
    }
  }, {
    sequelize,
    modelName: 'SaleProduct',
    timestamps: true
  });
  return SaleProduct;
};