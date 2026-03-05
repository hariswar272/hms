const express = require('express');
const http = require('http');
const cors = require('cors');
require('dotenv').config();

const { connectDB } = require('./src/config/database');
const { initSocket } = require('./src/config/socket');

// Import models to set up associations
require('./src/models');

// Import routes
const superAdminRoutes = require('./src/routes/superAdmin');
const hostelAdminRoutes = require('./src/routes/hostelAdmin');
const studentRoutes = require('./src/routes/student');

const app = express();
const server = http.createServer(app);

// Initialize Socket.io
initSocket(server);

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Routes
app.use('/api/super-admin', superAdminRoutes);
app.use('/api/hostel-admin', hostelAdminRoutes);
app.use('/api/student', studentRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Start server
const PORT = process.env.PORT || 3000;

const startServer = async () => {
  await connectDB();
  server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
};

startServer();
