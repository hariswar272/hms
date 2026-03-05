const { Student, Hostel, StudentRequest } = require('../../models');
const generateToken = require('../../utils/generateToken');
const { emitToHostel, emitToSuperAdmin } = require('../../config/socket');

// POST /api/student/register
const register = async (req, res) => {
  try {
    const { name, phone, email, password, collegeName, parentPhone } = req.body;

    const existing = await Student.findOne({ where: { email } });
    if (existing) {
      return res.status(400).json({ message: 'Email already registered' });
    }

    const student = await Student.create({
      name,
      phone,
      email,
      password,
      collegeName,
      parentPhone,
    });

    const token = generateToken(student, 'student');
    res.status(201).json({
      token,
      user: {
        id: student.id,
        name: student.name,
        email: student.email,
        role: 'student',
        hostelId: null,
      },
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// POST /api/student/login
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const student = await Student.findOne({ where: { email } });
    if (!student) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const isMatch = await student.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const token = generateToken(student, 'student');
    res.json({
      token,
      user: {
        id: student.id,
        name: student.name,
        email: student.email,
        role: 'student',
        hostelId: student.hostelId,
        roomId: student.roomId,
      },
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// POST /api/student/join-hostel
const joinHostel = async (req, res) => {
  try {
    const { hostelCode } = req.body;
    const studentId = req.user.id;

    const hostel = await Hostel.findOne({ where: { hostelCode } });
    if (!hostel) {
      return res.status(404).json({ message: 'Invalid hostel code' });
    }

    // Check if already requested
    const existingRequest = await StudentRequest.findOne({
      where: { studentId, hostelId: hostel.id, status: 'pending' },
    });
    if (existingRequest) {
      return res.status(400).json({ message: 'Request already pending for this hostel' });
    }

    // Check if already a member
    const student = await Student.findByPk(studentId);
    if (student.hostelId === hostel.id) {
      return res.status(400).json({ message: 'Already a member of this hostel' });
    }

    const request = await StudentRequest.create({
      studentId,
      hostelId: hostel.id,
    });

    // Notify admin via WebSocket in real-time
    emitToHostel(hostel.id, 'new_student_request', {
      message: `New join request from ${student.name}`,
      request: { ...request.toJSON(), student: { name: student.name, email: student.email, phone: student.phone } },
    });

    // Refresh admin dashboard
    emitToHostel(hostel.id, 'data_refresh', { type: 'requests' });

    res.status(201).json({ message: 'Join request sent', request });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// GET /api/student/profile
const getProfile = async (req, res) => {
  try {
    const student = await Student.findByPk(req.user.id, {
      attributes: { exclude: ['password'] },
      include: [
        { association: 'hostel', attributes: ['id', 'name', 'hostelCode'] },
        { association: 'room', include: [{ association: 'floor' }] },
      ],
    });
    res.json(student);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// PUT /api/student/profile
const updateProfile = async (req, res) => {
  try {
    const student = await Student.findByPk(req.user.id);
    const { name, phone, collegeName, parentPhone } = req.body;

    if (name) student.name = name;
    if (phone) student.phone = phone;
    if (collegeName) student.collegeName = collegeName;
    if (parentPhone) student.parentPhone = parentPhone;

    await student.save();
    res.json({ message: 'Profile updated', student: { id: student.id, name: student.name, phone: student.phone, collegeName: student.collegeName, parentPhone: student.parentPhone } });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

module.exports = { register, login, joinHostel, getProfile, updateProfile };
