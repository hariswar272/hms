const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Hostel = sequelize.define('Hostel', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  hostelCode: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
  },
  qrCode: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  address: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  city: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  adminId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'hostel_admins',
      key: 'id',
    },
  },
  trialStartDate: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
  },
  trialEndDate: {
    type: DataTypes.DATE,
    allowNull: false,
  },
  isSubscribed: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
  isLocked: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
}, {
  tableName: 'hostels',
  timestamps: true,
});

module.exports = Hostel;
