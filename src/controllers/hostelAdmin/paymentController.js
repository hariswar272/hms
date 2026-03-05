const { Payment, Student, Hostel, Notification } = require('../../models');
const { emitToUser, emitToHostel } = require('../../config/socket');

// POST /api/hostel-admin/payments/record
const recordPayment = async (req, res) => {
  try {
    const hostel = await Hostel.findOne({ where: { adminId: req.user.id } });
    if (!hostel) return res.status(404).json({ message: 'Hostel not found' });

    const { studentId, amount, month, year, paymentMode, transactionId } = req.body;

    const student = await Student.findOne({
      where: { id: studentId, hostelId: hostel.id, isActive: true },
    });
    if (!student) return res.status(404).json({ message: 'Student not found' });

    // Check if payment already exists for this month
    let payment = await Payment.findOne({
      where: { studentId, hostelId: hostel.id, month, year },
    });

    if (payment) {
      payment.amount = amount;
      payment.paymentMode = paymentMode;
      payment.transactionId = transactionId || null;
      payment.status = 'paid';
      payment.paidDate = new Date();
      await payment.save();
    } else {
      payment = await Payment.create({
        studentId,
        hostelId: hostel.id,
        amount,
        month,
        year,
        paymentMode,
        transactionId: transactionId || null,
        status: 'paid',
        paidDate: new Date(),
        dueDate: new Date(),
      });
    }

    // Notify student in real-time
    emitToUser(studentId, 'payment_recorded', {
      message: `Payment of ₹${amount} recorded for ${month} ${year}`,
      payment,
    });

    // Refresh dashboard for admin
    emitToHostel(hostel.id, 'data_refresh', { type: 'payments' });

    // Create notification
    await Notification.create({
      hostelId: hostel.id,
      title: 'Payment Recorded',
      message: `Payment of ₹${amount} recorded for ${month} ${year}`,
      type: 'general',
      targetUserId: studentId,
    });

    res.json({ message: 'Payment recorded', payment });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// GET /api/hostel-admin/payments
const getPayments = async (req, res) => {
  try {
    const hostel = await Hostel.findOne({ where: { adminId: req.user.id } });
    if (!hostel) return res.status(404).json({ message: 'Hostel not found' });

    const { month, year, status } = req.query;
    const where = { hostelId: hostel.id };
    if (month) where.month = month;
    if (year) where.year = parseInt(year);
    if (status) where.status = status;

    const payments = await Payment.findAll({
      where,
      include: [{ association: 'student', attributes: ['id', 'name', 'phone', 'email'] }],
      order: [['createdAt', 'DESC']],
    });
    res.json(payments);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// GET /api/hostel-admin/payments/student/:studentId
const getStudentPayments = async (req, res) => {
  try {
    const hostel = await Hostel.findOne({ where: { adminId: req.user.id } });
    if (!hostel) return res.status(404).json({ message: 'Hostel not found' });

    const payments = await Payment.findAll({
      where: { studentId: req.params.studentId, hostelId: hostel.id },
      order: [['year', 'DESC'], ['createdAt', 'DESC']],
    });
    res.json(payments);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

module.exports = { recordPayment, getPayments, getStudentPayments };
