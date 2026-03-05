const { HostelAdmin, Hostel, AppConfig } = require('../../models');
const generateToken = require('../../utils/generateToken');
const generateHostelCode = require('../../utils/generateHostelCode');
const generateQR = require('../../utils/generateQR');

// POST /api/hostel-admin/register
const register = async (req, res) => {
  try {
    const { username, email, password, hostelName } = req.body;

    const existingAdmin = await HostelAdmin.findOne({ where: { email } });
    if (existingAdmin) {
      return res.status(400).json({ message: 'Email already registered' });
    }

    const admin = await HostelAdmin.create({ username, email, password });

    // Generate hostel code and QR
    const hostelCode = generateHostelCode(hostelName);
    const qrCode = await generateQR(hostelCode);

    // Get trial days from config
    const trialConfig = await AppConfig.findOne({ where: { key: 'trial_days' } });
    const trialDays = trialConfig ? parseInt(trialConfig.value) : 14;

    const trialStartDate = new Date();
    const trialEndDate = new Date();
    trialEndDate.setDate(trialEndDate.getDate() + trialDays);

    const hostel = await Hostel.create({
      name: hostelName,
      hostelCode,
      qrCode,
      adminId: admin.id,
      trialStartDate,
      trialEndDate,
    });

    const token = generateToken(admin, 'hostel_admin');
    res.status(201).json({
      token,
      user: { id: admin.id, username: admin.username, email: admin.email, role: 'hostel_admin' },
      hostel: { id: hostel.id, name: hostel.name, hostelCode, qrCode, trialEndDate },
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// POST /api/hostel-admin/login
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const admin = await HostelAdmin.findOne({ where: { email } });
    if (!admin) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    if (admin.isBlocked) {
      return res.status(403).json({ message: 'Your account has been blocked' });
    }

    const isMatch = await admin.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const hostel = await Hostel.findOne({ where: { adminId: admin.id } });

    // Check trial expiry
    if (hostel && !hostel.isSubscribed) {
      const now = new Date();
      if (now > hostel.trialEndDate) {
        hostel.isLocked = true;
        await hostel.save();
      }
    }

    const token = generateToken(admin, 'hostel_admin');
    res.json({
      token,
      user: { id: admin.id, username: admin.username, email: admin.email, role: 'hostel_admin' },
      hostel: hostel ? {
        id: hostel.id,
        name: hostel.name,
        hostelCode: hostel.hostelCode,
        qrCode: hostel.qrCode,
        isLocked: hostel.isLocked,
        isSubscribed: hostel.isSubscribed,
        trialEndDate: hostel.trialEndDate,
      } : null,
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// GET /api/hostel-admin/profile
const getProfile = async (req, res) => {
  try {
    const admin = await HostelAdmin.findByPk(req.user.id, {
      attributes: { exclude: ['password'] },
      include: [{ association: 'hostel' }],
    });
    res.json(admin);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

module.exports = { register, login, getProfile };
