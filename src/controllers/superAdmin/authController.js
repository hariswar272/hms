const { SuperAdmin, AppConfig } = require('../../models');
const generateToken = require('../../utils/generateToken');

// POST /api/super-admin/login
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const admin = await SuperAdmin.findOne({ where: { email } });
    if (!admin) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const isMatch = await admin.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const token = generateToken(admin, 'super_admin');
    res.json({
      token,
      user: { id: admin.id, username: admin.username, email: admin.email, role: 'super_admin' },
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// POST /api/super-admin/setup (one-time setup)
const setup = async (req, res) => {
  try {
    const existing = await SuperAdmin.findOne();
    if (existing) {
      return res.status(400).json({ message: 'Super admin already exists' });
    }

    const { username, email, password } = req.body;
    const admin = await SuperAdmin.create({ username, email, password });

    // Set default app config
    await AppConfig.bulkCreate([
      { key: 'price_per_student', value: '10' },
      { key: 'trial_days', value: '14' },
    ]);

    const token = generateToken(admin, 'super_admin');
    res.status(201).json({
      token,
      user: { id: admin.id, username: admin.username, email: admin.email, role: 'super_admin' },
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

module.exports = { login, setup };
