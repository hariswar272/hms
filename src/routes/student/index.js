const router = require('express').Router();
const { authenticate, authorize } = require('../../middleware/auth');
const authController = require('../../controllers/student/authController');
const studentController = require('../../controllers/student/studentController');

// Auth (public)
router.post('/register', authController.register);
router.post('/login', authController.login);

// Protected routes
router.use(authenticate, authorize('student'));

// Profile
router.get('/profile', authController.getProfile);
router.put('/profile', authController.updateProfile);

// Join hostel
router.post('/join-hostel', authController.joinHostel);

// Payments
router.get('/payments', studentController.getPayments);

// Complaints
router.post('/complaints', studentController.createComplaint);
router.get('/complaints', studentController.getComplaints);

// Notifications
router.get('/notifications', studentController.getNotifications);
router.put('/notifications/:id/read', studentController.markNotificationRead);

// Room info
router.get('/room-info', studentController.getRoomInfo);

module.exports = router;
