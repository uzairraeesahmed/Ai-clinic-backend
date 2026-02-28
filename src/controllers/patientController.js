const Patient = require('../models/Patient');
const Appointment = require('../models/Appointment');
const Prescription = require('../models/Prescription');

// Free plan: max patients (per requirement: Free = limited patients, Pro = unlimited)
const FREE_PLAN_PATIENT_LIMIT = 5;

exports.list = async (req, res) => {
  try {
    const { role } = req.user;
    const filter = {};
    if (role === 'receptionist' || role === 'admin') {
      // can see all; optionally filter by createdBy
    } else if (role === 'doctor') {
      // doctors see all patients (clinic-wide)
    } else if (role === 'patient') {
      const p = await Patient.findOne({ userId: req.user._id });
      if (!p) return res.json({ success: true, data: [] });
      filter._id = p._id;
    }
    const patients = await Patient.find(filter)
      .populate('createdBy', 'name email')
      .sort({ createdAt: -1 })
      .lean();
    res.json({ success: true, data: patients });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getOne = async (req, res) => {
  try {
    const { id } = req.params;
    const patient = await Patient.findById(id).populate('createdBy', 'name email').lean();
    if (!patient) return res.status(404).json({ success: false, message: 'Patient not found' });
    // Role check: patient can only view self
    if (req.user.role === 'patient') {
      const p = await Patient.findOne({ userId: req.user._id });
      if (!p || p._id.toString() !== id) return res.status(403).json({ success: false, message: 'Access denied' });
    }
    res.json({ success: true, data: patient });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.create = async (req, res) => {
  try {
    const { name, age, gender, contact, email, createLogin } = req.body;
    if (!name || age == null || !gender) {
      return res.status(400).json({ success: false, message: 'Name, age, and gender are required' });
    }
    const User = require('../models/User');
    // Free plan: limit total patients (admin and Pro users are unrestricted)
    if (req.user.subscriptionPlan === 'free' && req.user.role !== 'admin') {
      const count = await Patient.countDocuments();
      if (count >= FREE_PLAN_PATIENT_LIMIT) {
        return res.status(403).json({
          success: false,
          message: `Free plan limit reached (${FREE_PLAN_PATIENT_LIMIT} patients). Upgrade to Pro for unlimited patients.`,
        });
      }
    }
    let userIdForPatient = null;
    if (createLogin && email) {
      const existing = await User.findOne({ email });
      if (existing) return res.status(409).json({ success: false, message: 'Email already registered' });
      const tempPassword = req.body.password || 'Patient123!';
      const newUser = await User.create({ email, password: tempPassword, name, role: 'patient' });
      userIdForPatient = newUser._id;
      await User.findByIdAndUpdate(newUser._id, { patientProfile: null }); // set after patient created
    }
    const patient = await Patient.create({
      name,
      age: Number(age),
      gender,
      contact: contact || '',
      createdBy: req.user._id,
      userId: userIdForPatient,
    });
    if (userIdForPatient) {
      await User.findByIdAndUpdate(userIdForPatient, { patientProfile: patient._id });
    }
    const populated = await Patient.findById(patient._id).populate('createdBy', 'name email').lean();
    res.status(201).json({ success: true, data: populated });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.update = async (req, res) => {
  try {
    const { id } = req.params;
    const patient = await Patient.findById(id);
    if (!patient) return res.status(404).json({ success: false, message: 'Patient not found' });
    if (req.user.role === 'patient') {
      const p = await Patient.findOne({ userId: req.user._id });
      if (!p || p._id.toString() !== id) return res.status(403).json({ success: false, message: 'Access denied' });
    }
    const { name, age, gender, contact } = req.body;
    if (name !== undefined) patient.name = name;
    if (age !== undefined) patient.age = Number(age);
    if (gender !== undefined) patient.gender = gender;
    if (contact !== undefined) patient.contact = contact;
    await patient.save();
    const populated = await Patient.findById(patient._id).populate('createdBy', 'name email').lean();
    res.json({ success: true, data: populated });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getHistory = async (req, res) => {
  try {
    const { id } = req.params;
    const patient = await Patient.findById(id).lean();
    if (!patient) return res.status(404).json({ success: false, message: 'Patient not found' });
    if (req.user.role === 'patient') {
      const p = await Patient.findOne({ userId: req.user._id });
      if (!p || p._id.toString() !== id) return res.status(403).json({ success: false, message: 'Access denied' });
    }
    const [appointments, prescriptions] = await Promise.all([
      Appointment.find({ patientId: id }).populate('doctorId', 'name').sort({ date: -1 }).lean(),
      Prescription.find({ patientId: id }).populate('doctorId', 'name').sort({ createdAt: -1 }).lean(),
    ]);
    res.json({
      success: true,
      data: {
        patient,
        appointments,
        prescriptions,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
