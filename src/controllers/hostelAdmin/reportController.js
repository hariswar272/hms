const { Payment, Expense, Student, Room, Hostel } = require('../../models');
const { Op } = require('sequelize');
const { sequelize } = require('../../config/database');

// GET /api/hostel-admin/reports/revenue?year=2026
const getRevenueReport = async (req, res) => {
  try {
    const hostel = await Hostel.findOne({ where: { adminId: req.user.id } });
    if (!hostel) return res.status(404).json({ message: 'Hostel not found' });

    const year = parseInt(req.query.year) || new Date().getFullYear();
    const months = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December',
    ];

    const monthlyRevenue = [];
    for (const month of months) {
      const total = await Payment.sum('amount', {
        where: { hostelId: hostel.id, month, year, status: 'paid' },
      });
      monthlyRevenue.push({ month, amount: total || 0 });
    }

    const totalRevenue = monthlyRevenue.reduce((sum, m) => sum + m.amount, 0);

    res.json({ year, monthlyRevenue, totalRevenue });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// GET /api/hostel-admin/reports/occupancy
const getOccupancyReport = async (req, res) => {
  try {
    const hostel = await Hostel.findOne({ where: { adminId: req.user.id } });
    if (!hostel) return res.status(404).json({ message: 'Hostel not found' });

    const totalRooms = await Room.count({ where: { hostelId: hostel.id } });
    const occupiedRooms = await Room.count({ where: { hostelId: hostel.id, status: 'occupied' } });
    const availableRooms = await Room.count({ where: { hostelId: hostel.id, status: 'available' } });
    const maintenanceRooms = await Room.count({ where: { hostelId: hostel.id, status: 'maintenance' } });

    const totalCapacity = await Room.sum('capacity', { where: { hostelId: hostel.id } }) || 0;
    const totalOccupancy = await Room.sum('currentOccupancy', { where: { hostelId: hostel.id } }) || 0;
    const occupancyRate = totalCapacity > 0 ? ((totalOccupancy / totalCapacity) * 100).toFixed(1) : 0;

    // Per floor breakdown
    const rooms = await Room.findAll({
      where: { hostelId: hostel.id },
      include: [{ association: 'floor' }],
    });

    const floorMap = {};
    rooms.forEach((room) => {
      const floorNum = room.floor?.floorNumber || 0;
      if (!floorMap[floorNum]) {
        floorMap[floorNum] = { floor: floorNum, totalRooms: 0, occupied: 0, capacity: 0, occupancy: 0 };
      }
      floorMap[floorNum].totalRooms++;
      if (room.status === 'occupied') floorMap[floorNum].occupied++;
      floorMap[floorNum].capacity += room.capacity;
      floorMap[floorNum].occupancy += room.currentOccupancy;
    });

    res.json({
      totalRooms,
      occupiedRooms,
      availableRooms,
      maintenanceRooms,
      totalCapacity,
      totalOccupancy,
      occupancyRate: parseFloat(occupancyRate),
      floorBreakdown: Object.values(floorMap),
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// GET /api/hostel-admin/reports/expenses?year=2026
const getExpenseReport = async (req, res) => {
  try {
    const hostel = await Hostel.findOne({ where: { adminId: req.user.id } });
    if (!hostel) return res.status(404).json({ message: 'Hostel not found' });

    const year = parseInt(req.query.year) || new Date().getFullYear();

    // Category-wise breakdown
    const categories = ['electricity', 'water', 'maintenance', 'staff_salary', 'grocery', 'other'];
    const categoryBreakdown = [];
    for (const cat of categories) {
      const total = await Expense.sum('amount', {
        where: {
          hostelId: hostel.id,
          category: cat,
          date: { [Op.between]: [`${year}-01-01`, `${year}-12-31`] },
        },
      });
      categoryBreakdown.push({ category: cat, amount: total || 0 });
    }

    // Monthly breakdown
    const monthlyExpenses = [];
    for (let m = 1; m <= 12; m++) {
      const startDate = `${year}-${String(m).padStart(2, '0')}-01`;
      const endDate = new Date(year, m, 0).toISOString().split('T')[0];
      const total = await Expense.sum('amount', {
        where: {
          hostelId: hostel.id,
          date: { [Op.between]: [startDate, endDate] },
        },
      });
      monthlyExpenses.push({
        month: new Date(year, m - 1).toLocaleString('default', { month: 'long' }),
        amount: total || 0,
      });
    }

    const totalExpenses = categoryBreakdown.reduce((sum, c) => sum + c.amount, 0);

    res.json({ year, categoryBreakdown, monthlyExpenses, totalExpenses });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// GET /api/hostel-admin/reports/payment-collection
const getPaymentCollectionReport = async (req, res) => {
  try {
    const hostel = await Hostel.findOne({ where: { adminId: req.user.id } });
    if (!hostel) return res.status(404).json({ message: 'Hostel not found' });

    const now = new Date();
    const currentMonth = now.toLocaleString('default', { month: 'long' });
    const currentYear = now.getFullYear();

    const totalStudents = await Student.count({ where: { hostelId: hostel.id, isActive: true } });
    const paidCount = await Payment.count({
      where: { hostelId: hostel.id, month: currentMonth, year: currentYear, status: 'paid' },
    });
    const pendingCount = totalStudents - paidCount;

    const totalCollected = await Payment.sum('amount', {
      where: { hostelId: hostel.id, month: currentMonth, year: currentYear, status: 'paid' },
    }) || 0;

    // List of unpaid students
    const paidStudentIds = (await Payment.findAll({
      where: { hostelId: hostel.id, month: currentMonth, year: currentYear, status: 'paid' },
      attributes: ['studentId'],
    })).map((p) => p.studentId);

    const unpaidStudents = await Student.findAll({
      where: {
        hostelId: hostel.id,
        isActive: true,
        ...(paidStudentIds.length > 0 ? { id: { [Op.notIn]: paidStudentIds } } : {}),
      },
      attributes: ['id', 'name', 'phone', 'email'],
      include: [{ association: 'room', attributes: ['roomNumber', 'rentAmount'] }],
    });

    res.json({
      currentMonth,
      currentYear,
      totalStudents,
      paidCount,
      pendingCount,
      totalCollected,
      unpaidStudents,
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

module.exports = { getRevenueReport, getOccupancyReport, getExpenseReport, getPaymentCollectionReport };
