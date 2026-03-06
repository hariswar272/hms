const crypto = require('crypto');
const razorpay = require('../../config/razorpay');
const { Hostel, Student, Subscription, AppConfig } = require('../../models');
const { emitToHostel, emitToSuperAdmin } = require('../../config/socket');

// GET /api/hostel-admin/subscription/status
const getSubscriptionStatus = async (req, res) => {
  try {
    const hostel = await Hostel.findOne({ where: { adminId: req.user.id } });
    if (!hostel) return res.status(404).json({ message: 'Hostel not found' });

    const activeStudents = await Student.count({
      where: { hostelId: hostel.id, isActive: true },
    });

    const priceConfig = await AppConfig.findOne({ where: { key: 'price_per_student' } });
    const pricePerStudent = priceConfig ? parseFloat(priceConfig.value) : 10;

    const totalAmount = activeStudents * pricePerStudent;

    const now = new Date();
    const currentMonth = now.toLocaleString('default', { month: 'long' });
    const currentYear = now.getFullYear();

    const currentSubscription = await Subscription.findOne({
      where: { hostelId: hostel.id, month: currentMonth, year: currentYear },
    });

    // Check trial status
    const isTrialActive = now <= new Date(hostel.trialEndDate);

    res.json({
      hostelId: hostel.id,
      hostelName: hostel.name,
      isSubscribed: hostel.isSubscribed,
      isLocked: hostel.isLocked,
      isTrialActive,
      trialEndDate: hostel.trialEndDate,
      activeStudents,
      pricePerStudent,
      totalAmount,
      currentMonth,
      currentYear,
      currentSubscription,
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// POST /api/hostel-admin/subscription/create-order
const createOrder = async (req, res) => {
  try {
    const hostel = await Hostel.findOne({ where: { adminId: req.user.id } });
    if (!hostel) return res.status(404).json({ message: 'Hostel not found' });

    const activeStudents = await Student.count({
      where: { hostelId: hostel.id, isActive: true },
    });

    const priceConfig = await AppConfig.findOne({ where: { key: 'price_per_student' } });
    const pricePerStudent = priceConfig ? parseFloat(priceConfig.value) : 10;

    const totalAmount = activeStudents * pricePerStudent;

    if (totalAmount <= 0) {
      return res.status(400).json({ message: 'No active students to bill' });
    }

    const options = {
      amount: Math.round(totalAmount * 100), // Razorpay expects amount in paise
      currency: 'INR',
      receipt: `sub_${hostel.id}_${Date.now()}`,
      notes: {
        hostelId: hostel.id.toString(),
        hostelName: hostel.name,
        studentCount: activeStudents.toString(),
        pricePerStudent: pricePerStudent.toString(),
      },
    };

    const order = await razorpay.orders.create(options);

    res.json({
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      keyId: process.env.RAZORPAY_KEY_ID,
      hostelName: hostel.name,
      activeStudents,
      pricePerStudent,
      totalAmount,
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// POST /api/hostel-admin/subscription/verify-payment
const verifyPayment = async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

    // Verify signature
    const generatedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest('hex');

    if (generatedSignature !== razorpay_signature) {
      return res.status(400).json({ message: 'Payment verification failed' });
    }

    const hostel = await Hostel.findOne({ where: { adminId: req.user.id } });
    if (!hostel) return res.status(404).json({ message: 'Hostel not found' });

    const activeStudents = await Student.count({
      where: { hostelId: hostel.id, isActive: true },
    });

    const priceConfig = await AppConfig.findOne({ where: { key: 'price_per_student' } });
    const pricePerStudent = priceConfig ? parseFloat(priceConfig.value) : 10;
    const totalAmount = activeStudents * pricePerStudent;

    const now = new Date();
    const currentMonth = now.toLocaleString('default', { month: 'long' });
    const currentYear = now.getFullYear();

    // Create or update subscription record
    let subscription = await Subscription.findOne({
      where: { hostelId: hostel.id, month: currentMonth, year: currentYear },
    });

    if (subscription) {
      subscription.status = 'paid';
      subscription.razorpayPaymentId = razorpay_payment_id;
      subscription.paidDate = now;
      subscription.amount = totalAmount;
      subscription.studentCount = activeStudents;
      subscription.pricePerStudent = pricePerStudent;
      await subscription.save();
    } else {
      subscription = await Subscription.create({
        hostelId: hostel.id,
        amount: totalAmount,
        studentCount: activeStudents,
        pricePerStudent,
        month: currentMonth,
        year: currentYear,
        status: 'paid',
        razorpayPaymentId: razorpay_payment_id,
        paidDate: now,
      });
    }

    // Unlock hostel
    hostel.isLocked = false;
    hostel.isSubscribed = true;
    await hostel.save();

    // Notify super admin about subscription payment
    emitToSuperAdmin('data_refresh', { type: 'dashboard' });
    emitToHostel(hostel.id, 'data_refresh', { type: 'subscription' });

    res.json({
      message: 'Payment verified and subscription activated',
      subscription,
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// GET /api/hostel-admin/subscription/history
const getPaymentHistory = async (req, res) => {
  try {
    const hostel = await Hostel.findOne({ where: { adminId: req.user.id } });
    if (!hostel) return res.status(404).json({ message: 'Hostel not found' });

    const subscriptions = await Subscription.findAll({
      where: { hostelId: hostel.id },
      order: [['year', 'DESC'], ['createdAt', 'DESC']],
    });

    res.json(subscriptions);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

module.exports = { getSubscriptionStatus, createOrder, verifyPayment, getPaymentHistory };
