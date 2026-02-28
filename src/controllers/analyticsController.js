const User = require('../models/User');
const Patient = require('../models/Patient');
const Appointment = require('../models/Appointment');
const Prescription = require('../models/Prescription');

exports.adminDashboard = async (req, res) => {
  try {
    const [totalPatients, totalDoctors, totalAppointments, appointmentsByStatus, prescriptionsCount] = await Promise.all([
      Patient.countDocuments(),
      User.countDocuments({ role: 'doctor' }),
      Appointment.countDocuments(),
      Appointment.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
      Prescription.countDocuments(),
    ]);
    const statusCounts = { scheduled: 0, completed: 0, cancelled: 0, 'no-show': 0 };
    appointmentsByStatus.forEach((s) => { statusCounts[s._id] = s.count; });
    const revenue = totalAppointments * 50;
    const commonDiagnoses = await Prescription.aggregate([
      { $match: { diagnosis: { $exists: true, $ne: '' } } },
      { $group: { _id: '$diagnosis', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 },
    ]);
    res.json({
      success: true,
      data: {
        totalPatients,
        totalDoctors,
        totalAppointments,
        prescriptionsCount,
        appointmentsByStatus: statusCounts,
        revenue,
        commonDiagnoses,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.doctorDashboard = async (req, res) => {
  try {
    const doctorId = req.user._id;
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date(todayStart);
    todayEnd.setDate(todayEnd.getDate() + 1);
    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);
    const [dailyAppointments, monthlyAppointments, prescriptionCount] = await Promise.all([
      Appointment.countDocuments({ doctorId, date: { $gte: todayStart, $lt: todayEnd }, status: 'scheduled' }),
      Appointment.countDocuments({ doctorId, date: { $gte: monthStart }, status: { $in: ['scheduled', 'completed'] } }),
      Prescription.countDocuments({ doctorId }),
    ]);
    res.json({
      success: true,
      data: {
        dailyAppointments,
        monthlyAppointments,
        prescriptionCount,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
