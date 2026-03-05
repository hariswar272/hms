const SuperAdmin = require('./SuperAdmin');
const HostelAdmin = require('./HostelAdmin');
const Hostel = require('./Hostel');
const Floor = require('./Floor');
const Room = require('./Room');
const Student = require('./Student');
const StudentRequest = require('./StudentRequest');
const Payment = require('./Payment');
const Expense = require('./Expense');
const Complaint = require('./Complaint');
const Notification = require('./Notification');
const Subscription = require('./Subscription');
const AppConfig = require('./AppConfig');

// HostelAdmin <-> Hostel
HostelAdmin.hasOne(Hostel, { foreignKey: 'adminId', as: 'hostel' });
Hostel.belongsTo(HostelAdmin, { foreignKey: 'adminId', as: 'admin' });

// Hostel <-> Floor
Hostel.hasMany(Floor, { foreignKey: 'hostelId', as: 'floors' });
Floor.belongsTo(Hostel, { foreignKey: 'hostelId', as: 'hostel' });

// Hostel <-> Room
Hostel.hasMany(Room, { foreignKey: 'hostelId', as: 'rooms' });
Room.belongsTo(Hostel, { foreignKey: 'hostelId', as: 'hostel' });

// Floor <-> Room
Floor.hasMany(Room, { foreignKey: 'floorId', as: 'rooms' });
Room.belongsTo(Floor, { foreignKey: 'floorId', as: 'floor' });

// Hostel <-> Student
Hostel.hasMany(Student, { foreignKey: 'hostelId', as: 'students' });
Student.belongsTo(Hostel, { foreignKey: 'hostelId', as: 'hostel' });

// Room <-> Student
Room.hasMany(Student, { foreignKey: 'roomId', as: 'students' });
Student.belongsTo(Room, { foreignKey: 'roomId', as: 'room' });

// Student <-> StudentRequest
Student.hasMany(StudentRequest, { foreignKey: 'studentId', as: 'requests' });
StudentRequest.belongsTo(Student, { foreignKey: 'studentId', as: 'student' });

// Hostel <-> StudentRequest
Hostel.hasMany(StudentRequest, { foreignKey: 'hostelId', as: 'studentRequests' });
StudentRequest.belongsTo(Hostel, { foreignKey: 'hostelId', as: 'hostel' });

// Student <-> Payment
Student.hasMany(Payment, { foreignKey: 'studentId', as: 'payments' });
Payment.belongsTo(Student, { foreignKey: 'studentId', as: 'student' });

// Hostel <-> Payment
Hostel.hasMany(Payment, { foreignKey: 'hostelId', as: 'payments' });
Payment.belongsTo(Hostel, { foreignKey: 'hostelId', as: 'hostel' });

// Hostel <-> Expense
Hostel.hasMany(Expense, { foreignKey: 'hostelId', as: 'expenses' });
Expense.belongsTo(Hostel, { foreignKey: 'hostelId', as: 'hostel' });

// Student <-> Complaint
Student.hasMany(Complaint, { foreignKey: 'studentId', as: 'complaints' });
Complaint.belongsTo(Student, { foreignKey: 'studentId', as: 'student' });

// Hostel <-> Complaint
Hostel.hasMany(Complaint, { foreignKey: 'hostelId', as: 'complaints' });
Complaint.belongsTo(Hostel, { foreignKey: 'hostelId', as: 'hostel' });

// Hostel <-> Notification
Hostel.hasMany(Notification, { foreignKey: 'hostelId', as: 'notifications' });
Notification.belongsTo(Hostel, { foreignKey: 'hostelId', as: 'hostel' });

// Hostel <-> Subscription
Hostel.hasMany(Subscription, { foreignKey: 'hostelId', as: 'subscriptions' });
Subscription.belongsTo(Hostel, { foreignKey: 'hostelId', as: 'hostel' });

module.exports = {
  SuperAdmin,
  HostelAdmin,
  Hostel,
  Floor,
  Room,
  Student,
  StudentRequest,
  Payment,
  Expense,
  Complaint,
  Notification,
  Subscription,
  AppConfig,
};
