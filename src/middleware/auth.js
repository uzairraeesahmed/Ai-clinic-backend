const jwt = require('jsonwebtoken');
const Session = require('../models/Session');
const User = require('../models/User');

const JWT_SECRET = process.env.JWT_SECRET;

/**
 * Attach req.user if valid session. Does not reject.
 */
exports.protect = async (req, res, next) => {
  try {
    const token = req.cookies?.session_token;
    if (!token) {
      return res.status(401).json({ success: false, message: 'Not authenticated' });
    }
    const decoded = jwt.verify(token, JWT_SECRET);
    const session = await Session.findOne({ token }).populate('user');
    if (!session || !session.user || session.user._id.toString() !== decoded.id) {
      return res.status(401).json({ success: false, message: 'Invalid or expired session' });
    }
    req.user = session.user;
    next();
  } catch (err) {
    res.status(401).json({ success: false, message: 'Not authenticated' });
  }
};

/**
 * Require one of the given roles.
 * Use after protect.
 */
exports.requireRole = (...roles) => (req, res, next) => {
  if (!req.user) return res.status(401).json({ success: false, message: 'Not authenticated' });
  if (!roles.includes(req.user.role)) {
    return res.status(403).json({ success: false, message: 'Access denied' });
  }
  next();
};

/**
 * Optional: require Pro plan for AI/advanced features.
 */
exports.requirePro = (req, res, next) => {
  if (!req.user) return res.status(401).json({ success: false, message: 'Not authenticated' });
  if (req.user.subscriptionPlan !== 'pro' && req.user.role !== 'admin') {
    return res.status(403).json({ success: false, message: 'Pro subscription required' });
  }
  next();
};
