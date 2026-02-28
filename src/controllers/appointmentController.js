const Appointment = require('../models/Appointment');
const Patient = require('../models/Patient');

exports.list = async (req, res) => {
  try {
    const { role } = req.user;
    const { doctorId, patientId, dateFrom, dateTo, status } = req.query;
    const filter = {};
    if (role === 'doctor') filter.doctorId = req.user._id;
    else if (role === 'patient') {
      const p = await Patient.findOne({ userId: req.user._id });
      if (!p) return res.json({ success: true, data: [] });
      filter.patientId = p._id;
    } else {
      if (doctorId) filter.doctorId = doctorId;
      if (patientId) filter.patientId = patientId;
    }
    if (status) filter.status = status;
    if (dateFrom || dateTo) {
      filter.date = {};
      if (dateFrom) filter.date.$gte = new Date(dateFrom);
      if (dateTo) filter.date.$lte = new Date(dateTo);
    }
    const appointments = await Appointment.find(filter)
      .populate('patientId', 'name age gender contact')
      .populate('doctorId', 'name email')
      .sort({ date: 1 })
      .lean();
    res.json({ success: true, data: appointments });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getOne = async (req, res) => {
  try {
    const apt = await Appointment.findById(req.params.id)
      .populate('patientId', 'name age gender contact')
      .populate('doctorId', 'name email')
      .lean();
    if (!apt) return res.status(404).json({ success: false, message: 'Appointment not found' });
    if (req.user.role === 'patient') {
      const p = await Patient.findOne({ userId: req.user._id });
      if (!p || p._id.toString() !== apt.patientId._id.toString()) return res.status(403).json({ success: false, message: 'Access denied' });
    } else if (req.user.role === 'doctor' && apt.doctorId._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }
    res.json({ success: true, data: apt });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.create = async (req, res) => {
  try {
    const { patientId, doctorId, date, notes } = req.body;
    if (!patientId || !doctorId || !date) {
      return res.status(400).json({ success: false, message: 'patientId, doctorId, and date are required' });
    }
    const appointment = await Appointment.create({
      patientId,
      doctorId,
      date: new Date(date),
      notes: notes || '',
      status: 'scheduled',
    });
    const populated = await Appointment.findById(appointment._id)
      .populate('patientId', 'name age gender contact')
      .populate('doctorId', 'name email')
      .lean();
    res.status(201).json({ success: true, data: populated });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.update = async (req, res) => {
  try {
    const apt = await Appointment.findById(req.params.id);
    if (!apt) return res.status(404).json({ success: false, message: 'Appointment not found' });
    const { date, status, notes } = req.body;
    if (date !== undefined) apt.date = new Date(date);
    if (status !== undefined) apt.status = status;
    if (notes !== undefined) apt.notes = notes;
    await apt.save();
    const populated = await Appointment.findById(apt._id)
      .populate('patientId', 'name age gender contact')
      .populate('doctorId', 'name email')
      .lean();
    res.json({ success: true, data: populated });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.delete = async (req, res) => {
  try {
    const apt = await Appointment.findById(req.params.id);
    if (!apt) return res.status(404).json({ success: false, message: 'Appointment not found' });
    apt.status = 'cancelled';
    await apt.save();
    res.json({ success: true, message: 'Appointment cancelled' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
