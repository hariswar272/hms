const { Hostel, HostelAdmin, Student, Subscription, AppConfig } = require('../../models');
const { Op } = require('sequelize');
const { sequelize } = require('../../config/database');
const { emitToHostelAdmin, emitToSuperAdmin } = require('../../config/socket');

// GET /api/super-admin/dashboard
const getDashboard = async (req, res) => {
  try {
    const totalHostels = await Hostel.count();
    const totalStudents = await Student.count({ where: { isActive: true } });
    const totalAdmins = await HostelAdmin.count();

    const now = new Date();
    const currentMonth = now.toLocaleString('default', { month: 'long' });
    const currentYear = now.getFullYear();

    const monthlyRevenue = await Subscription.sum('amount', {
      where: { month: currentMonth, year: currentYear, status: 'paid' },
    });

    const overdueHostels = await Hostel.count({ where: { isLocked: true } });

    res.json({
      totalHostels,
      totalStudents,
      totalAdmins,
      monthlyRevenue: monthlyRevenue || 0,
      overdueHostels,
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// GET /api/super-admin/hostels
const getAllHostels = async (req, res) => {
  try {
    const hostels = await Hostel.findAll({
      include: [
        { association: 'admin', attributes: ['id', 'username', 'email', 'isActive', 'isBlocked'] },
      ],
    });

    const hostelsWithStudentCount = await Promise.all(
      hostels.map(async (hostel) => {
        const studentCount = await Student.count({
          where: { hostelId: hostel.id, isActive: true },
        });
        return { ...hostel.toJSON(), studentCount };
      })
    );

    res.json(hostelsWithStudentCount);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// PUT /api/super-admin/pricing
const updatePricing = async (req, res) => {
  try {
    const { pricePerStudent } = req.body;
    await AppConfig.update(
      { value: String(pricePerStudent) },
      { where: { key: 'price_per_student' } }
    );
    emitToSuperAdmin('data_refresh', { type: 'config' });

    res.json({ message: 'Pricing updated', pricePerStudent });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// PUT /api/super-admin/trial-days
const updateTrialDays = async (req, res) => {
  try {
    const { trialDays } = req.body;
    await AppConfig.update(
      { value: String(trialDays) },
      { where: { key: 'trial_days' } }
    );
    emitToSuperAdmin('data_refresh', { type: 'config' });

    res.json({ message: 'Trial days updated', trialDays });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// PUT /api/super-admin/admins/:id/block
const toggleBlockAdmin = async (req, res) => {
  try {
    const admin = await HostelAdmin.findByPk(req.params.id);
    if (!admin) {
      return res.status(404).json({ message: 'Admin not found' });
    }

    admin.isBlocked = !admin.isBlocked;
    await admin.save();

    // Also lock/unlock the hostel
    await Hostel.update(
      { isLocked: admin.isBlocked },
      { where: { adminId: admin.id } }
    );

    // Notify the admin about their status change
    emitToHostelAdmin(admin.id, 'admin_blocked', {
      message: admin.isBlocked ? 'Your account has been blocked by admin.' : 'Your account has been unblocked.',
      isBlocked: admin.isBlocked,
    });
    emitToSuperAdmin('data_refresh', { type: 'admins' });

    res.json({ message: `Admin ${admin.isBlocked ? 'blocked' : 'unblocked'}`, admin });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// DELETE /api/super-admin/admins/:id
const deleteAdmin = async (req, res) => {
  try {
    const admin = await HostelAdmin.findByPk(req.params.id);
    if (!admin) {
      return res.status(404).json({ message: 'Admin not found' });
    }

    admin.isActive = false;
    await admin.save();

    await Hostel.update({ isLocked: true }, { where: { adminId: admin.id } });

    emitToHostelAdmin(admin.id, 'admin_blocked', {
      message: 'Your account has been deactivated.',
      isBlocked: true,
    });
    emitToSuperAdmin('data_refresh', { type: 'admins' });

    res.json({ message: 'Admin deactivated' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// GET /api/super-admin/config
const getConfig = async (req, res) => {
  try {
    const configs = await AppConfig.findAll();
    const configObj = {};
    configs.forEach((c) => { configObj[c.key] = c.value; });
    res.json(configObj);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

module.exports = {
  getDashboard,
  getAllHostels,
  updatePricing,
  updateTrialDays,
  toggleBlockAdmin,
  deleteAdmin,
  getConfig,
};
