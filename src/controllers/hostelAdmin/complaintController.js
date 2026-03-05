const { Complaint, Hostel, Notification } = require('../../models');
const { emitToUser, emitToHostel } = require('../../config/socket');

// GET /api/hostel-admin/complaints
const getComplaints = async (req, res) => {
  try {
    const hostel = await Hostel.findOne({ where: { adminId: req.user.id } });
    if (!hostel) return res.status(404).json({ message: 'Hostel not found' });

    const { status } = req.query;
    const where = { hostelId: hostel.id };
    if (status) where.status = status;

    const complaints = await Complaint.findAll({
      where,
      include: [{ association: 'student', attributes: ['id', 'name', 'phone', 'email'] }],
      order: [['createdAt', 'DESC']],
    });
    res.json(complaints);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// PUT /api/hostel-admin/complaints/:id/status
const updateComplaintStatus = async (req, res) => {
  try {
    const hostel = await Hostel.findOne({ where: { adminId: req.user.id } });
    const complaint = await Complaint.findOne({
      where: { id: req.params.id, hostelId: hostel.id },
    });
    if (!complaint) return res.status(404).json({ message: 'Complaint not found' });

    const { status } = req.body;
    complaint.status = status;
    await complaint.save();

    // Notify student in real-time
    emitToUser(complaint.studentId, 'complaint_update', {
      message: `Your complaint status updated to: ${status}`,
      complaint,
    });

    // Refresh complaints data
    emitToHostel(hostel.id, 'data_refresh', { type: 'complaints' });

    await Notification.create({
      hostelId: hostel.id,
      title: 'Complaint Updated',
      message: `Your complaint status has been updated to: ${status}`,
      type: 'complaint_update',
      targetUserId: complaint.studentId,
    });

    res.json({ message: 'Complaint status updated', complaint });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

module.exports = { getComplaints, updateComplaintStatus };
