const { Expense, Hostel } = require('../../models');

// POST /api/hostel-admin/expenses
const addExpense = async (req, res) => {
  try {
    const hostel = await Hostel.findOne({ where: { adminId: req.user.id } });
    if (!hostel) return res.status(404).json({ message: 'Hostel not found' });

    const { category, description, amount, date } = req.body;
    const expense = await Expense.create({
      hostelId: hostel.id,
      category,
      description,
      amount,
      date,
    });
    res.status(201).json(expense);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// GET /api/hostel-admin/expenses
const getExpenses = async (req, res) => {
  try {
    const hostel = await Hostel.findOne({ where: { adminId: req.user.id } });
    if (!hostel) return res.status(404).json({ message: 'Hostel not found' });

    const { month, year } = req.query;
    const where = { hostelId: hostel.id };

    if (month && year) {
      const { Op } = require('sequelize');
      const startDate = new Date(year, month - 1, 1);
      const endDate = new Date(year, month, 0);
      where.date = { [Op.between]: [startDate, endDate] };
    }

    const expenses = await Expense.findAll({
      where,
      order: [['date', 'DESC']],
    });
    res.json(expenses);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// DELETE /api/hostel-admin/expenses/:id
const deleteExpense = async (req, res) => {
  try {
    const hostel = await Hostel.findOne({ where: { adminId: req.user.id } });
    const expense = await Expense.findOne({ where: { id: req.params.id, hostelId: hostel.id } });
    if (!expense) return res.status(404).json({ message: 'Expense not found' });

    await expense.destroy();
    res.json({ message: 'Expense deleted' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

module.exports = { addExpense, getExpenses, deleteExpense };
