const User = require('../models/User');
const Session = require('../models/Session');
require('../models/Patient'); // ensure model is registered for populate
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';
const isProduction = process.env.NODE_ENV === 'production' || !!process.env.VERCEL;
// Cross-origin (frontend on different domain): must use sameSite: 'none' + secure so browser sends cookie
const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: isProduction,
  sameSite: isProduction ? 'none' : 'lax',
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days in ms
  path: '/',
};

const signToken = (id) => {
  return jwt.sign({ id }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
};

const createSessionAndSetCookie = async (userId, token, res) => {
  const decoded = jwt.verify(token, JWT_SECRET);
  const expiresAt = new Date(decoded.exp * 1000);
  await Session.create({ user: userId, token, expiresAt });
  res.cookie('session_token', token, COOKIE_OPTIONS);
};

exports.signup = async (req, res) => {
  try {
    const { email, password, name } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required',
      });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: 'User with this email already exists',
      });
    }

    // Only allow patient, doctor, receptionist via signup (admin created via seed only)
    const role = req.body.role && ['patient', 'doctor', 'receptionist'].includes(req.body.role) ? req.body.role : 'patient';
    const user = await User.create({ email, password, name, role });
    const token = signToken(user._id);
    await createSessionAndSetCookie(user._id, token, res);

    res.status(201).json({
      success: true,
      message: 'User created successfully',
      data: {
        user: {
          id: user._id,
          email: user.email,
          name: user.name,
          role: user.role,
          subscriptionPlan: user.subscriptionPlan,
          avatarUrl: user.avatarUrl || null,
        },
      },
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message || 'Signup failed',
    });
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required',
      });
    }

    const user = await User.findOne({ email }).select('+password');
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password',
      });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password',
      });
    }

    const token = signToken(user._id);
    await createSessionAndSetCookie(user._id, token, res);

    res.json({
      success: true,
      message: 'Login successful',
      data: {
        user: {
          id: user._id,
          email: user.email,
          name: user.name,
          role: user.role,
          subscriptionPlan: user.subscriptionPlan,
          avatarUrl: user.avatarUrl || null,
        },
      },
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message || 'Login failed',
    });
  }
};

exports.getMe = async (req, res) => {
  try {
    const token = req.cookies?.session_token;
    if (!token) {
      return res.status(401).json({ success: false, message: 'Not authenticated' });
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    const session = await Session.findOne({ token }).populate([{ path: 'user', populate: { path: 'patientProfile', model: 'Patient' } }]);
    if (!session || !session.user || session.user._id.toString() !== decoded.id) {
      return res.status(401).json({ success: false, message: 'Invalid or expired session' });
    }

    const user = session.user;
    res.json({
      success: true,
      data: {
        user: {
          id: user._id,
          email: user.email,
          name: user.name,
          role: user.role,
          subscriptionPlan: user.subscriptionPlan,
          avatarUrl: user.avatarUrl || null,
          patientProfile: user.patientProfile ? { id: user.patientProfile._id, name: user.patientProfile.name } : null,
        },
      },
    });
  } catch (err) {
    res.status(401).json({ success: false, message: 'Not authenticated' });
  }
};

exports.logout = async (req, res) => {
  try {
    const token = req.cookies?.session_token;
    if (token) {
      await Session.deleteOne({ token });
    }
    res.clearCookie('session_token', { path: '/', httpOnly: true, secure: isProduction, sameSite: isProduction ? 'none' : 'lax' });
    res.json({ success: true, message: 'Logged out' });
  } catch (err) {
    res.clearCookie('session_token', { path: '/', httpOnly: true, secure: isProduction, sameSite: isProduction ? 'none' : 'lax' });
    res.json({ success: true, message: 'Logged out' });
  }
};
