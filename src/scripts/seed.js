/**
 * Seed admin, doctor, receptionist, and a sample patient user.
 * Run: node src/scripts/seed.js
 */
require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');
const Patient = require('../models/Patient');

const MONGODB_URI = process.env.MONGODB_URI;

async function seed() {
  if (!MONGODB_URI) {
    console.error('MONGODB_URI not set');
    process.exit(1);
  }
  await mongoose.connect(MONGODB_URI);
  console.log('Connected to MongoDB');

  const existingAdmin = await User.findOne({ email: 'admin@clinic.com' });
  if (!existingAdmin) {
    await User.create({
      email: 'uzairraees922@gmail.com',
      password: 'Admin123!',
      name: 'Uzair Ahmed',
      role: 'admin',
      subscriptionPlan: 'pro',
    });
    console.log('Created admin@clinic.com / Admin123!');
  }

  const existingDoctor = await User.findOne({ email: 'doctor@clinic.com' });
  if (!existingDoctor) {
    await User.create({
      email: 'doctor@clinic.com',
      password: 'Doctor123!',
      name: 'Dr. Sarah',
      role: 'doctor',
      subscriptionPlan: 'pro',
    });
    console.log('Created doctor@clinic.com / Doctor123!');
  }

  const existingReceptionist = await User.findOne({ email: 'reception@clinic.com' });
  if (!existingReceptionist) {
    await User.create({
      email: 'reception@clinic.com',
      password: 'Reception123!',
      name: 'Receptionist Jane',
      role: 'receptionist',
      subscriptionPlan: 'pro',
    });
    console.log('Created reception@clinic.com / Reception123!');
  }

  const existingPatientUser = await User.findOne({ email: 'patient@clinic.com' });
  if (!existingPatientUser) {
    const patientUser = await User.create({
      email: 'patient@clinic.com',
      password: 'Patient123!',
      name: 'John Patient',
      role: 'patient',
      subscriptionPlan: 'free',
    });
    const receptionist = await User.findOne({ role: 'receptionist' });
    const patientRecord = await Patient.create({
      name: 'John Patient',
      age: 30,
      gender: 'male',
      contact: '+1234567890',
      createdBy: receptionist._id,
      userId: patientUser._id,
    });
    await User.findByIdAndUpdate(patientUser._id, { patientProfile: patientRecord._id });
    console.log('Created patient@clinic.com / Patient123! (with patient profile)');
  }

  console.log('Seed done.');
  await mongoose.disconnect();
  process.exit(0);
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
