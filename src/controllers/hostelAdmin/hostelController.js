const { Hostel, Floor, Room, Student, StudentRequest } = require('../../models');
const { emitToUser, emitToHostel, emitToSuperAdmin } = require('../../config/socket');

// POST /api/hostel-admin/floors
const addFloor = async (req, res) => {
  try {
    const hostel = await Hostel.findOne({ where: { adminId: req.user.id } });
    if (!hostel) return res.status(404).json({ message: 'Hostel not found' });

    const { floorNumber } = req.body;

    const existing = await Floor.findOne({ where: { hostelId: hostel.id, floorNumber } });
    if (existing) return res.status(400).json({ message: 'Floor already exists' });

    const floor = await Floor.create({ floorNumber, hostelId: hostel.id });
    res.status(201).json(floor);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// GET /api/hostel-admin/floors
const getFloors = async (req, res) => {
  try {
    const hostel = await Hostel.findOne({ where: { adminId: req.user.id } });
    if (!hostel) return res.status(404).json({ message: 'Hostel not found' });

    const floors = await Floor.findAll({
      where: { hostelId: hostel.id },
      include: [{ association: 'rooms' }],
      order: [['floorNumber', 'ASC']],
    });
    res.json(floors);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// POST /api/hostel-admin/rooms
const addRoom = async (req, res) => {
  try {
    const hostel = await Hostel.findOne({ where: { adminId: req.user.id } });
    if (!hostel) return res.status(404).json({ message: 'Hostel not found' });

    const { roomNumber, roomType, capacity, rentAmount, floorId } = req.body;

    const floor = await Floor.findOne({ where: { id: floorId, hostelId: hostel.id } });
    if (!floor) return res.status(404).json({ message: 'Floor not found' });

    const room = await Room.create({
      roomNumber,
      roomType,
      capacity,
      rentAmount,
      floorId,
      hostelId: hostel.id,
    });
    res.status(201).json(room);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// GET /api/hostel-admin/rooms
const getRooms = async (req, res) => {
  try {
    const hostel = await Hostel.findOne({ where: { adminId: req.user.id } });
    if (!hostel) return res.status(404).json({ message: 'Hostel not found' });

    const rooms = await Room.findAll({
      where: { hostelId: hostel.id },
      include: [
        { association: 'floor' },
        { association: 'students', where: { isActive: true }, required: false },
      ],
      order: [['roomNumber', 'ASC']],
    });
    res.json(rooms);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// PUT /api/hostel-admin/rooms/:id
const updateRoom = async (req, res) => {
  try {
    const hostel = await Hostel.findOne({ where: { adminId: req.user.id } });
    const room = await Room.findOne({ where: { id: req.params.id, hostelId: hostel.id } });
    if (!room) return res.status(404).json({ message: 'Room not found' });

    const { roomType, capacity, rentAmount, status } = req.body;
    if (roomType) room.roomType = roomType;
    if (capacity) room.capacity = capacity;
    if (rentAmount) room.rentAmount = rentAmount;
    if (status) room.status = status;

    await room.save();
    res.json(room);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// GET /api/hostel-admin/student-requests
const getStudentRequests = async (req, res) => {
  try {
    const hostel = await Hostel.findOne({ where: { adminId: req.user.id } });
    if (!hostel) return res.status(404).json({ message: 'Hostel not found' });

    const requests = await StudentRequest.findAll({
      where: { hostelId: hostel.id, status: 'pending' },
      include: [{ association: 'student', attributes: { exclude: ['password'] } }],
      order: [['createdAt', 'DESC']],
    });
    res.json(requests);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// PUT /api/hostel-admin/student-requests/:id/approve
const approveStudentRequest = async (req, res) => {
  try {
    const hostel = await Hostel.findOne({ where: { adminId: req.user.id } });
    const request = await StudentRequest.findOne({
      where: { id: req.params.id, hostelId: hostel.id },
      include: [{ association: 'student' }],
    });
    if (!request) return res.status(404).json({ message: 'Request not found' });

    const { roomId } = req.body;
    const room = await Room.findOne({ where: { id: roomId, hostelId: hostel.id } });
    if (!room) return res.status(404).json({ message: 'Room not found' });

    if (room.currentOccupancy >= room.capacity) {
      return res.status(400).json({ message: 'Room is full' });
    }

    // Update request
    request.status = 'approved';
    request.allocatedRoomId = roomId;
    await request.save();

    // Update student
    const student = request.student;
    student.hostelId = hostel.id;
    student.roomId = roomId;
    student.checkInDate = new Date();
    await student.save();

    // Update room occupancy
    room.currentOccupancy += 1;
    if (room.currentOccupancy >= room.capacity) {
      room.status = 'occupied';
    }
    await room.save();

    // Notify student via WebSocket
    const floor = await room.getFloor();
    emitToUser(student.id, 'request_approved', {
      message: 'Your hostel request has been approved!',
      roomNumber: room.roomNumber,
      floorNumber: floor.floorNumber,
    });

    // Notify all hostel members about new student
    emitToHostel(hostel.id, 'data_refresh', { type: 'students' });

    // Notify super admin about new student
    emitToSuperAdmin('data_refresh', { type: 'dashboard' });

    res.json({ message: 'Student approved and allocated', request });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// PUT /api/hostel-admin/student-requests/:id/reject
const rejectStudentRequest = async (req, res) => {
  try {
    const hostel = await Hostel.findOne({ where: { adminId: req.user.id } });
    const request = await StudentRequest.findOne({
      where: { id: req.params.id, hostelId: hostel.id },
    });
    if (!request) return res.status(404).json({ message: 'Request not found' });

    request.status = 'rejected';
    await request.save();

    res.json({ message: 'Request rejected' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// GET /api/hostel-admin/students
const getStudents = async (req, res) => {
  try {
    const hostel = await Hostel.findOne({ where: { adminId: req.user.id } });
    if (!hostel) return res.status(404).json({ message: 'Hostel not found' });

    const students = await Student.findAll({
      where: { hostelId: hostel.id, isActive: true },
      attributes: { exclude: ['password'] },
      include: [{ association: 'room', include: [{ association: 'floor' }] }],
    });
    res.json(students);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// PUT /api/hostel-admin/students/:id/transfer
const transferStudent = async (req, res) => {
  try {
    const hostel = await Hostel.findOne({ where: { adminId: req.user.id } });
    const student = await Student.findOne({
      where: { id: req.params.id, hostelId: hostel.id, isActive: true },
    });
    if (!student) return res.status(404).json({ message: 'Student not found' });

    const { newRoomId } = req.body;
    const newRoom = await Room.findOne({ where: { id: newRoomId, hostelId: hostel.id } });
    if (!newRoom) return res.status(404).json({ message: 'New room not found' });

    if (newRoom.currentOccupancy >= newRoom.capacity) {
      return res.status(400).json({ message: 'New room is full' });
    }

    // Free old room
    if (student.roomId) {
      const oldRoom = await Room.findByPk(student.roomId);
      if (oldRoom) {
        oldRoom.currentOccupancy = Math.max(0, oldRoom.currentOccupancy - 1);
        if (oldRoom.currentOccupancy < oldRoom.capacity) oldRoom.status = 'available';
        await oldRoom.save();
      }
    }

    // Assign new room
    student.roomId = newRoomId;
    await student.save();

    newRoom.currentOccupancy += 1;
    if (newRoom.currentOccupancy >= newRoom.capacity) newRoom.status = 'occupied';
    await newRoom.save();

    res.json({ message: 'Student transferred', student });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// PUT /api/hostel-admin/students/:id/checkout
const checkoutStudent = async (req, res) => {
  try {
    const hostel = await Hostel.findOne({ where: { adminId: req.user.id } });
    const student = await Student.findOne({
      where: { id: req.params.id, hostelId: hostel.id, isActive: true },
    });
    if (!student) return res.status(404).json({ message: 'Student not found' });

    // Free room
    if (student.roomId) {
      const room = await Room.findByPk(student.roomId);
      if (room) {
        room.currentOccupancy = Math.max(0, room.currentOccupancy - 1);
        if (room.currentOccupancy < room.capacity) room.status = 'available';
        await room.save();
      }
    }

    student.isActive = false;
    student.checkOutDate = new Date();
    student.roomId = null;
    await student.save();

    res.json({ message: 'Student checked out' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// GET /api/hostel-admin/dashboard
const getDashboard = async (req, res) => {
  try {
    const hostel = await Hostel.findOne({ where: { adminId: req.user.id } });
    if (!hostel) return res.status(404).json({ message: 'Hostel not found' });

    const totalRooms = await Room.count({ where: { hostelId: hostel.id } });
    const occupiedRooms = await Room.count({ where: { hostelId: hostel.id, status: 'occupied' } });
    const availableRooms = await Room.count({ where: { hostelId: hostel.id, status: 'available' } });
    const totalStudents = await Student.count({ where: { hostelId: hostel.id, isActive: true } });

    const { Payment } = require('../../models');
    const now = new Date();
    const currentMonth = now.toLocaleString('default', { month: 'long' });
    const currentYear = now.getFullYear();

    const monthlyRevenue = await Payment.sum('amount', {
      where: { hostelId: hostel.id, month: currentMonth, year: currentYear, status: 'paid' },
    });

    const pendingDues = await Payment.count({
      where: { hostelId: hostel.id, status: ['pending', 'overdue'] },
    });

    const pendingRequests = await StudentRequest.count({
      where: { hostelId: hostel.id, status: 'pending' },
    });

    res.json({
      totalRooms,
      occupiedRooms,
      availableRooms,
      totalStudents,
      monthlyRevenue: monthlyRevenue || 0,
      pendingDues,
      pendingRequests,
      hostel: {
        name: hostel.name,
        hostelCode: hostel.hostelCode,
        isLocked: hostel.isLocked,
        isSubscribed: hostel.isSubscribed,
        trialEndDate: hostel.trialEndDate,
      },
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

module.exports = {
  addFloor,
  getFloors,
  addRoom,
  getRooms,
  updateRoom,
  getStudentRequests,
  approveStudentRequest,
  rejectStudentRequest,
  getStudents,
  transferStudent,
  checkoutStudent,
  getDashboard,
};
