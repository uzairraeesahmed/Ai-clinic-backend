const mongoose = require('mongoose');

const diagnosisLogSchema = new mongoose.Schema(
  {
    patientId: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient', default: null },
    doctorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    symptoms: { type: String, required: true },
    age: { type: Number, default: null },
    gender: { type: String, default: '' },
    history: { type: String, default: '' },
    aiResponse: { type: String, default: '' },
    riskLevel: { type: String, enum: ['low', 'medium', 'high'], default: 'low' },
    riskFlags: [{ type: String }],
    suggestedTests: [{ type: String }],
    createdAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

module.exports = mongoose.model('DiagnosisLog', diagnosisLogSchema);
