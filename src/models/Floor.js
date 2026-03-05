const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Floor = sequelize.define('Floor', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  floorNumber: {
    type: DataTypes.INTEGER,
    allowNull: false,
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
  tableName: 'floors',
  timestamps: true,
});

module.exports = Floor;
