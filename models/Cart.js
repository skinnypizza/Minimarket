const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Cart = sequelize.define('Cart', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'Users',
        key: 'id'
      }
    },
    status: {
      type: DataTypes.STRING(50),
      defaultValue: 'pending',
      validate: {
        isIn: [['pending', 'completed', 'cancelled', 'expired']]
      }
    },
    totalAmount: {
      type: DataTypes.DOUBLE,
      defaultValue: 0
    },
    reservationNumber: {
      type: DataTypes.STRING(50),
      unique: true
    },
    expiresAt: {
      type: DataTypes.DATE
    },
    completedAt: {
      type: DataTypes.DATE
    },
    notes: {
      type: DataTypes.TEXT
    }
  }, {
    timestamps: true,
    tableName: 'Carts'
  });

  Cart.associate = function(models) {
    Cart.belongsTo(models.User, { foreignKey: 'userId', as: 'user' });
    Cart.hasMany(models.CartItem, { foreignKey: 'cartId', as: 'items' });
  };

  // Método para generar número de reserva único
  Cart.generateReservationNumber = function() {
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `RES-${timestamp}-${random}`;
  };

  return Cart;
};
