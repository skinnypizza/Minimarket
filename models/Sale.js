const { Model, DataTypes } = require('sequelize');

class Sale extends Model {}

module.exports = (sequelize) => {
  Sale.init({
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    userId: {
      type: DataTypes.INTEGER
      // La referencia se establecerá en el archivo de asociaciones central
    },
    totalAmount: {
      type: DataTypes.DOUBLE,
      allowNull: false
    },
    cashReceived: {
      type: DataTypes.DOUBLE,
      allowNull: false
    },
    changeGiven: {
      type: DataTypes.DOUBLE,
      allowNull: false
    }
  }, {
    sequelize,
    modelName: 'Sale',
    timestamps: true
  });
  return Sale;
};