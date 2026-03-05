const router = require('express').Router();
const { authenticate, authorize, checkHostelLock } = require('../../middleware/auth');
const authController = require('../../controllers/hostelAdmin/authController');
const hostelController = require('../../controllers/hostelAdmin/hostelController');
const paymentController = require('../../controllers/hostelAdmin/paymentController');
const expenseController = require('../../controllers/hostelAdmin/expenseController');
const complaintController = require('../../controllers/hostelAdmin/complaintController');
const notificationController = require('../../controllers/hostelAdmin/notificationController');
const subscriptionController = require('../../controllers/hostelAdmin/subscriptionController');
const reportController = require('../../controllers/hostelAdmin/reportController');

// Auth (public)
router.post('/register', authController.register);
router.post('/login', authController.login);

// Protected routes (subscription routes skip hostel lock check)
router.get('/subscription/status', authenticate, authorize('hostel_admin'), subscriptionController.getSubscriptionStatus);
router.post('/subscription/create-order', authenticate, authorize('hostel_admin'), subscriptionController.createOrder);
router.post('/subscription/verify-payment', authenticate, authorize('hostel_admin'), subscriptionController.verifyPayment);
router.get('/subscription/history', authenticate, authorize('hostel_admin'), subscriptionController.getPaymentHistory);

// Protected routes (locked hostels blocked)
router.use(authenticate, authorize('hostel_admin'), checkHostelLock);

// Profile
router.get('/profile', authController.getProfile);

// Dashboard
router.get('/dashboard', hostelController.getDashboard);

// Floors
router.post('/floors', hostelController.addFloor);
router.get('/floors', hostelController.getFloors);

// Rooms
router.post('/rooms', hostelController.addRoom);
router.get('/rooms', hostelController.getRooms);
router.put('/rooms/:id', hostelController.updateRoom);

// Student requests
router.get('/student-requests', hostelController.getStudentRequests);
router.put('/student-requests/:id/approve', hostelController.approveStudentRequest);
router.put('/student-requests/:id/reject', hostelController.rejectStudentRequest);

// Students
router.get('/students', hostelController.getStudents);
router.put('/students/:id/transfer', hostelController.transferStudent);
router.put('/students/:id/checkout', hostelController.checkoutStudent);

// Payments
router.post('/payments/record', paymentController.recordPayment);
router.get('/payments', paymentController.getPayments);
router.get('/payments/student/:studentId', paymentController.getStudentPayments);

// Expenses
router.post('/expenses', expenseController.addExpense);
router.get('/expenses', expenseController.getExpenses);
router.delete('/expenses/:id', expenseController.deleteExpense);

// Complaints
router.get('/complaints', complaintController.getComplaints);
router.put('/complaints/:id/status', complaintController.updateComplaintStatus);

// Notifications
router.post('/notifications/announcement', notificationController.sendAnnouncement);
router.post('/notifications/rent-reminder', notificationController.sendRentReminder);

// Reports
router.get('/reports/revenue', reportController.getRevenueReport);
router.get('/reports/occupancy', reportController.getOccupancyReport);
router.get('/reports/expenses', reportController.getExpenseReport);
router.get('/reports/payment-collection', reportController.getPaymentCollectionReport);

module.exports = router;
