const User = require('../models/User');
const Patient = require('../models/Patient');

exports.createUser = async (req, res) => {
  try {
    const { email, password, name, role } = req.body;
    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email and password are required' });
    }
    if (!['patient', 'doctor', 'receptionist'].includes(role)) {
      return res.status(400).json({ success: false, message: 'Role must be patient, doctor, or receptionist' });
    }
    const existing = await User.findOne({ email });
    if (existing) return res.status(409).json({ success: false, message: 'Email already registered' });
    const user = await User.create({ email, password, name, role });
    const data = user.toObject();
    delete data.password;
    res.status(201).json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.listUsers = async (req, res) => {
  try {
    const { role } = req.query;
    const filter = {};
    if (role) filter.role = role;
    const users = await User.find(filter).select('-password').sort({ createdAt: -1 }).lean();
    res.json({ success: true, data: users });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.updateSubscription = async (req, res) => {
  try {
    const { userId } = req.params;
    const { subscriptionPlan } = req.body;
    if (!['free', 'pro'].includes(subscriptionPlan)) {
      return res.status(400).json({ success: false, message: 'subscriptionPlan must be free or pro' });
    }
    const user = await User.findByIdAndUpdate(userId, { subscriptionPlan }, { new: true }).select('-password').lean();
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    res.json({ success: true, data: user });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.updateMe = async (req, res) => {
  try {
    const { avatarUrl, name } = req.body;
    const update = {};
    if (avatarUrl !== undefined) update.avatarUrl = avatarUrl;
    if (name !== undefined) update.name = name;
    const user = await User.findByIdAndUpdate(req.user._id, update, { new: true })
      .select('-password')
      .lean();
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    res.json({ success: true, data: user });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.listDoctors = async (req, res) => {
  try {
    const doctors = await User.find({ role: 'doctor' }).select('_id name email').lean();
    res.json({ success: true, data: doctors });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
