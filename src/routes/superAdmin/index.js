const router = require('express').Router();
const { authenticate, authorize } = require('../../middleware/auth');
const authController = require('../../controllers/superAdmin/authController');
const dashboardController = require('../../controllers/superAdmin/dashboardController');

// Auth
router.post('/setup', authController.setup);
router.post('/login', authController.login);

// Protected routes
router.use(authenticate, authorize('super_admin'));

router.get('/dashboard', dashboardController.getDashboard);
router.get('/hostels', dashboardController.getAllHostels);
router.get('/config', dashboardController.getConfig);
router.put('/pricing', dashboardController.updatePricing);
router.put('/trial-days', dashboardController.updateTrialDays);
router.put('/admins/:id/block', dashboardController.toggleBlockAdmin);
router.delete('/admins/:id', dashboardController.deleteAdmin);

module.exports = router;
