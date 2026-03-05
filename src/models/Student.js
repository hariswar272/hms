const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');
const bcrypt = require('bcryptjs');

const Student = sequelize.define('Student', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  phone: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  email: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
  },
  password: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  collegeName: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  parentPhone: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  hostelId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'hostels',
      key: 'id',
    },
  },
  roomId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'rooms',
      key: 'id',
    },
  },
  checkInDate: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  checkOutDate: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  },
}, {
  tableName: 'students',
  timestamps: true,
  hooks: {
    beforeCreate: async (student) => {
      student.password = await bcrypt.hash(student.password, 10);
    },
  },
});

Student.prototype.comparePassword = async function (password) {
  return bcrypt.compare(password, this.password);
};

module.exports = Student;
