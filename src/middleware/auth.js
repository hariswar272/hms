const jwt = require('jsonwebtoken');

const authenticate = (req, res, next) => {
  const token = req.header('Authorization')?.replace('Bearer ', '');

  if (!token) {
    return res.status(401).json({ message: 'No token, authorization denied' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ message: 'Token is not valid' });
  }
};

const authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ message: 'Access denied' });
    }
    next();
  };
};

const checkHostelLock = async (req, res, next) => {
  const { Hostel } = require('../models');

  if (req.user.role === 'hostel_admin') {
    const hostel = await Hostel.findOne({ where: { adminId: req.user.id } });
    if (hostel && hostel.isLocked) {
      return res.status(403).json({
        message: 'Your hostel account is locked. Please pay your subscription to continue.',
        isLocked: true,
      });
    }
  }

  next();
};

module.exports = { authenticate, authorize, checkHostelLock };
