const { Notification, Hostel, Student } = require('../../models');
const { emitToUser, emitToHostel } = require('../../config/socket');

// POST /api/hostel-admin/notifications/announcement
const sendAnnouncement = async (req, res) => {
  try {
    const hostel = await Hostel.findOne({ where: { adminId: req.user.id } });
    if (!hostel) return res.status(404).json({ message: 'Hostel not found' });

    const { title, message } = req.body;

    const notification = await Notification.create({
      hostelId: hostel.id,
      title,
      message,
      type: 'announcement',
      targetUserId: null, // broadcast to all
    });

    // Broadcast to all students in hostel in real-time
    emitToHostel(hostel.id, 'announcement', { title, message });
    emitToHostel(hostel.id, 'data_refresh', { type: 'notifications' });

    res.status(201).json({ message: 'Announcement sent', notification });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// POST /api/hostel-admin/notifications/rent-reminder
const sendRentReminder = async (req, res) => {
  try {
    const hostel = await Hostel.findOne({ where: { adminId: req.user.id } });
    if (!hostel) return res.status(404).json({ message: 'Hostel not found' });

    const { studentIds, message } = req.body;

    const notifications = [];
    for (const studentId of studentIds) {
      const notification = await Notification.create({
        hostelId: hostel.id,
        title: 'Rent Reminder',
        message: message || 'Your rent payment is due. Please pay at the earliest.',
        type: 'rent_reminder',
        targetUserId: studentId,
      });
      notifications.push(notification);

      emitToUser(studentId, 'rent_reminder', {
        title: 'Rent Reminder',
        message: message || 'Your rent payment is due. Please pay at the earliest.',
      });
    }

    res.json({ message: 'Rent reminders sent', count: notifications.length });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

module.exports = { sendAnnouncement, sendRentReminder };
