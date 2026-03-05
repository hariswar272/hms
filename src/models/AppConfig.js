const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const AppConfig = sequelize.define('AppConfig', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  key: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
  },
  value: {
    type: DataTypes.STRING,
    allowNull: false,
  },
}, {
  tableName: 'app_config',
  timestamps: true,
});

module.exports = AppConfig;
