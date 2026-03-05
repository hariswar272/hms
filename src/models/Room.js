const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Room = sequelize.define('Room', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  roomNumber: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  roomType: {
    type: DataTypes.ENUM('single', 'double', 'triple', 'shared'),
    allowNull: false,
  },
  capacity: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  currentOccupancy: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
  },
  rentAmount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
  },
  status: {
    type: DataTypes.ENUM('available', 'occupied', 'maintenance'),
    defaultValue: 'available',
  },
  floorId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'floors',
      key: 'id',
    },
  },
  hostelId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'hostels',
      key: 'id',
    },
  },
}, {
  tableName: 'rooms',
  timestamps: true,
});

module.exports = Room;
