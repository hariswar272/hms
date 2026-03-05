const { Payment, Complaint, Notification, Student, Room } = require('../../models');
const { emitToHostel } = require('../../config/socket');

// GET /api/student/payments
const getPayments = async (req, res) => {
  try {
    const payments = await Payment.findAll({
      where: { studentId: req.user.id },
      order: [['year', 'DESC'], ['createdAt', 'DESC']],
    });
    res.json(payments);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// POST /api/student/complaints
const createComplaint = async (req, res) => {
  try {
    const student = await Student.findByPk(req.user.id);
    if (!student.hostelId) {
      return res.status(400).json({ message: 'You are not assigned to any hostel' });
    }

    const { category, description } = req.body;
    const complaint = await Complaint.create({
      studentId: req.user.id,
      hostelId: student.hostelId,
      category,
      description,
    });

    // Notify admin in real-time about new complaint
    emitToHostel(student.hostelId, 'new_complaint', {
      message: `New complaint from ${student.name}: ${category}`,
      complaint,
    });
    emitToHostel(student.hostelId, 'data_refresh', { type: 'complaints' });

    res.status(201).json(complaint);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// GET /api/student/complaints
const getComplaints = async (req, res) => {
  try {
    const complaints = await Complaint.findAll({
      where: { studentId: req.user.id },
      order: [['createdAt', 'DESC']],
    });
    res.json(complaints);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// GET /api/student/notifications
const getNotifications = async (req, res) => {
  try {
    const student = await Student.findByPk(req.user.id);

    const notifications = await Notification.findAll({
      where: {
        hostelId: student.hostelId,
        [require('sequelize').Op.or]: [
          { targetUserId: req.user.id },
          { targetUserId: null }, // broadcast notifications
        ],
      },
      order: [['createdAt', 'DESC']],
      limit: 50,
    });
    res.json(notifications);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// PUT /api/student/notifications/:id/read
const markNotificationRead = async (req, res) => {
  try {
    const notification = await Notification.findByPk(req.params.id);
    if (!notification) return res.status(404).json({ message: 'Notification not found' });

    notification.isRead = true;
    await notification.save();
    res.json({ message: 'Marked as read' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// GET /api/student/room-info
const getRoomInfo = async (req, res) => {
  try {
    const student = await Student.findByPk(req.user.id);
    if (!student.roomId) {
      return res.json({ message: 'No room assigned yet', room: null });
    }

    const room = await Room.findByPk(student.roomId, {
      include: [
        { association: 'floor' },
        {
          association: 'students',
          where: { isActive: true },
          attributes: ['id', 'name', 'phone', 'collegeName'],
          required: false,
        },
      ],
    });
    res.json(room);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

module.exports = {
  getPayments,
  createComplaint,
  getComplaints,
  getNotifications,
  markNotificationRead,
  getRoomInfo,
};
