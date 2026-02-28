const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const ROLES = ['admin', 'doctor', 'receptionist', 'patient'];
const PLANS = ['free', 'pro'];

const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: 6,
    select: false,
  },
  name: {
    type: String,
    trim: true,
  },
  role: {
    type: String,
    enum: ROLES,
    default: 'patient',
  },
  subscriptionPlan: {
    type: String,
    enum: PLANS,
    default: 'free',
  },
  // Link to Patient record when role is 'patient'
  patientProfile: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient', default: null },
  avatarUrl: { type: String, default: null },
}, {
  timestamps: true,
});

// Hash password before saving
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model('User', userSchema);
