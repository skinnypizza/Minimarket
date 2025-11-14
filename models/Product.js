const { Model, DataTypes } = require('sequelize');

class Product extends Model {
  get totalStock() {
    if (this.batches) {
      return this.batches.reduce((total, batch) => total + batch.quantity, 0);
    }
    return 0;
  }
}

module.exports = (sequelize) => {
  Product.init({
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
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
  return Product;
};