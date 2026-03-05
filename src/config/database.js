const { Sequelize } = require('sequelize');
require('dotenv').config();

const sequelize = new Sequelize(
  process.env.DB_NAME,
  process.env.DB_USER,
  process.env.DB_PASS || process.env.DB_PASSWORD,
  {
    host: process.env.DB_HOST,
    port: process.env.DB_PORT || 3306,
    dialect: 'mysql',
    logging: process.env.NODE_ENV === 'development' ? console.log : false,
    pool: {
      max: 10,
      min: 0,
      acquire: 30000,
      idle: 10000,
    },
  }
);

const connectDB = async () => {
  console.log('DB Config:', {
    host: process.env.DB_HOST || 'NOT SET',
    user: process.env.DB_USER || 'NOT SET',
    pass: process.env.DB_PASS ? '***SET***' : (process.env.DB_PASSWORD ? '***SET***' : 'NOT SET'),
    name: process.env.DB_NAME || 'NOT SET',
    port: process.env.DB_PORT || 3306,
  });
  try {
    await sequelize.authenticate();
    console.log('MySQL connected successfully');
    await sequelize.sync({ alter: true });
    console.log('Database synced');
  } catch (error) {
    console.error('Database connection failed:', error.name, error.message, error.original?.code, error.original?.errno);
    process.exit(1);
  }
};

module.exports = { sequelize, connectDB };
