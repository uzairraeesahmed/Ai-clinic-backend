const DiagnosisLog = require('../models/DiagnosisLog');
const aiService = require('../services/aiService');

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

exports.symptomChecker = async (req, res) => {
  try {
    const { symptoms, age, gender, history, patientId } = req.body;
    if (!symptoms || typeof symptoms !== 'string') {
      return res.status(400).json({ success: false, message: 'symptoms (string) is required' });
    }

    let previousChecksSummary = '';
    const serverFlags = [];
    if (patientId) {
      const since = new Date(Date.now() - THIRTY_DAYS_MS);
      const pastLogs = await DiagnosisLog.find({ patientId, createdAt: { $gte: since } })
        .sort({ createdAt: -1 })
        .limit(10)
        .lean();
      if (pastLogs.length > 0) {
        previousChecksSummary = pastLogs
          .map((l) => `${l.createdAt.toISOString().slice(0, 10)}: ${l.symptoms} (risk: ${l.riskLevel})`)
          .join('; ');
        const elevatedCount = pastLogs.filter((l) => l.riskLevel === 'high' || l.riskLevel === 'medium').length;
        if (elevatedCount >= 2) serverFlags.push('elevated_risk_history');
        if (pastLogs.length >= 3) serverFlags.push('repeated_visits');
      }
    }

    const { aiResponse, riskLevel, riskFlags: aiFlags = [], model } = await aiService.symptomChecker(
      symptoms,
      age,
      gender,
      history,
      previousChecksSummary
    );
    const suggestedTests = [];
    if (aiResponse && aiResponse.toLowerCase().includes('test')) {
      const match = aiResponse.match(/suggested tests?[:\s]+([^.]+)/i);
      if (match) suggestedTests.push(...match[1].split(/[,;]/).map((s) => s.trim()).filter(Boolean));
    }
    const riskFlags = [...new Set([...serverFlags, ...aiFlags])];
    await DiagnosisLog.create({
      doctorId: req.user._id,
      patientId: patientId || null,
      symptoms,
      age: age ? Number(age) : null,
      gender: gender || '',
      history: history || '',
      aiResponse,
      riskLevel: riskLevel || 'low',
      riskFlags,
      suggestedTests,
    });
    res.json({
      success: true,
      data: { aiResponse, riskLevel, suggestedTests, riskFlags, model },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.prescriptionExplanation = async (req, res) => {
  try {
    const { medicines, instructions, language } = req.body;
    if (!Array.isArray(medicines)) {
      return res.status(400).json({ success: false, message: 'medicines array is required' });
    }
    const { explanation, model } = await aiService.prescriptionExplanation(medicines, instructions, language || 'en');
    res.json({ success: true, data: { explanation, model } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
