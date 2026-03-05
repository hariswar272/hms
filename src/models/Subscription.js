const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Subscription = sequelize.define('Subscription', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  hostelId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'hostels',
      key: 'id',
    },
  },
  amount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
  },
  studentCount: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  pricePerStudent: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    defaultValue: 10.00,
  },
  month: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  year: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  status: {
    type: DataTypes.ENUM('pending', 'paid', 'overdue'),
    defaultValue: 'pending',
  },
  razorpayPaymentId: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  paidDate: {
    type: DataTypes.DATE,
    allowNull: true,
  },
}, {
  tableName: 'subscriptions',
  timestamps: true,
});

module.exports = Subscription;
