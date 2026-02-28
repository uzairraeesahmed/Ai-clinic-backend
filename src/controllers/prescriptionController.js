const Prescription = require('../models/Prescription');
const Patient = require('../models/Patient');

exports.list = async (req, res) => {
  try {
    const { patientId } = req.query;
    const filter = {};
    if (req.user.role === 'doctor') filter.doctorId = req.user._id;
    else if (req.user.role === 'patient') {
      const p = await Patient.findOne({ userId: req.user._id });
      if (!p) return res.json({ success: true, data: [] });
      filter.patientId = p._id;
    } else if (patientId) filter.patientId = patientId;
    const list = await Prescription.find(filter)
      .populate('patientId', 'name age gender')
      .populate('doctorId', 'name')
      .sort({ createdAt: -1 })
      .lean();
    res.json({ success: true, data: list });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getOne = async (req, res) => {
  try {
    const pre = await Prescription.findById(req.params.id)
      .populate('patientId', 'name age gender contact')
      .populate('doctorId', 'name email')
      .lean();
    if (!pre) return res.status(404).json({ success: false, message: 'Prescription not found' });
    if (req.user.role === 'patient') {
      const p = await Patient.findOne({ userId: req.user._id });
      if (!p || p._id.toString() !== pre.patientId._id.toString()) return res.status(403).json({ success: false, message: 'Access denied' });
    }
    res.json({ success: true, data: pre });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.create = async (req, res) => {
  try {
    const { patientId, appointmentId, medicines, instructions, diagnosis, aiExplanation } = req.body;
    if (!patientId || !Array.isArray(medicines)) {
      return res.status(400).json({ success: false, message: 'patientId and medicines array are required' });
    }
    const prescription = await Prescription.create({
      patientId,
      doctorId: req.user._id,
      appointmentId: appointmentId || null,
      medicines: medicines.map((m) => ({
        name: m.name || '',
        dosage: m.dosage || '',
        frequency: m.frequency || '',
        duration: m.duration || '',
        notes: m.notes || '',
      })),
      instructions: instructions || '',
      diagnosis: diagnosis || '',
      aiExplanation: aiExplanation || '',
    });
    const populated = await Prescription.findById(prescription._id)
      .populate('patientId', 'name age gender')
      .populate('doctorId', 'name')
      .lean();
    res.status(201).json({ success: true, data: populated });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.downloadPdf = async (req, res) => {
  try {
    const pre = await Prescription.findById(req.params.id)
      .populate('patientId', 'name age gender contact')
      .populate('doctorId', 'name');
    if (!pre) return res.status(404).json({ success: false, message: 'Prescription not found' });
    if (req.user.role === 'patient') {
      const p = await Patient.findOne({ userId: req.user._id });
      if (!p || p._id.toString() !== pre.patientId._id.toString()) return res.status(403).json({ success: false, message: 'Access denied' });
    }
    const PDFDocument = require('pdfkit');
    const doc = new PDFDocument({ margin: 50 });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=prescription-${pre._id}.pdf`);
    doc.pipe(res);
    doc.fontSize(18).text('Prescription', { align: 'center' });
    doc.moveDown();
    doc.fontSize(11).text(`Patient: ${pre.patientId.name} | Age: ${pre.patientId.age} | Gender: ${pre.patientId.gender}`);
    doc.text(`Doctor: ${pre.doctorId.name}`);
    doc.text(`Date: ${new Date(pre.createdAt).toLocaleDateString()}`);
    doc.moveDown();
    if (pre.diagnosis) doc.text(`Diagnosis: ${pre.diagnosis}`).moveDown();
    doc.text('Medicines:');
    pre.medicines.forEach((m) => {
      doc.text(`  • ${m.name} - ${m.dosage} ${m.frequency} ${m.duration} ${m.notes || ''}`);
    });
    doc.moveDown();
    if (pre.instructions) doc.text(`Instructions: ${pre.instructions}`);
    doc.end();
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
