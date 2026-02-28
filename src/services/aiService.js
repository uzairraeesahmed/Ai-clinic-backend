/**
 * AI service with fallback. Uses Google Gemini if GEMINI_API_KEY is set; otherwise returns safe fallback.
 */

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_MODEL = process.env.GEMINI_MODEL || '';
// Current Gemini API model IDs (gemini-pro / gemini-1.5-flash are deprecated and return 404)
const FALLBACK_MODELS = ['gemini-2.5-flash'];

async function callGeminiWithModel(systemPrompt, userContent, model) {
  const fullPrompt = `${systemPrompt}\n\n${userContent}`;
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_API_KEY}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: fullPrompt }] }],
      generationConfig: {
        maxOutputTokens: 800,
        temperature: 0.4,
      },
    }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) return { ok: false, status: res.status, data };
  if (data.promptFeedback?.blockReason) return { ok: false, blocked: true };
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  return { ok: true, text: text ? text.trim() : null, model };
}

function getRetryDelaySeconds(data) {
  const details = data?.details || [];
  const retryInfo = details.find((d) => d['@type']?.includes('RetryInfo'));
  const seconds = retryInfo?.retryDelay?.replace?.(/s$/, '') || 0;
  return Math.min(Number(seconds) || 0, 30);
}

async function callGemini(systemPrompt, userContent) {
  if (!GEMINI_API_KEY) {
    console.warn('[Gemini] GEMINI_API_KEY is not set in .env');
    return null;
  }
  const modelsToTry = GEMINI_MODEL ? [GEMINI_MODEL] : FALLBACK_MODELS;
  for (const model of modelsToTry) {
    try {
      let result = await callGeminiWithModel(systemPrompt, userContent, model);
      if (result.ok && result.text) return { text: result.text, model: result.model };
      if (result.ok === false && result.status === 404) {
        console.warn('[Gemini] Model not found:', model, '- trying next');
        continue;
      }
      if (result.ok === false && result.status === 429) {
        console.warn('[Gemini] Quota/rate limit (429) for', model, '- trying next model');
        const waitSec = getRetryDelaySeconds(result.data);
        if (waitSec > 0 && modelsToTry.indexOf(model) < modelsToTry.length - 1) {
          await new Promise((r) => setTimeout(r, waitSec * 1000));
        }
        continue;
      }
      if (result.ok === false && result.status) {
        console.error('[Gemini] API error:', result.status, JSON.stringify(result.data));
        return null;
      }
    } catch (err) {
      console.error('[Gemini] Request failed:', err.message);
      return null;
    }
  }
  console.warn('[Gemini] No model succeeded. Tried:', modelsToTry.join(', '));
  return null;
}

const RISK_FLAG_LABELS = {
  repeated_pattern: 'Repeated/similar symptoms pattern',
  chronic_indicators: 'Possible chronic condition indicators',
  high_risk_combination: 'High-risk symptom/demographic combination',
  elevated_risk_history: 'Elevated risk in recent history',
  repeated_visits: 'Multiple symptom checks in short period',
};

function parseRiskFlags(text) {
  if (!text) return [];
  const lower = text.toLowerCase();
  const flags = [];
  if (lower.includes('repeated_pattern') || lower.includes('repeated pattern')) flags.push('repeated_pattern');
  if (lower.includes('chronic_indicators') || lower.includes('chronic indicator')) flags.push('chronic_indicators');
  if (lower.includes('high_risk_combination') || lower.includes('high-risk combination')) flags.push('high_risk_combination');
  const riskFlagsLine = text.match(/risk flags?[:\s]+([^\n.]+)/i);
  if (riskFlagsLine) {
    const part = riskFlagsLine[1].toLowerCase();
    if (part.includes('repeated') && !flags.includes('repeated_pattern')) flags.push('repeated_pattern');
    if (part.includes('chronic') && !flags.includes('chronic_indicators')) flags.push('chronic_indicators');
    if ((part.includes('high') && part.includes('risk')) && !flags.includes('high_risk_combination')) flags.push('high_risk_combination');
  }
  return [...new Set(flags)];
}

exports.symptomChecker = async (symptoms, age, gender, history, previousChecksSummary = '') => {
  const systemPrompt = `You are a medical assistant. Based on the following, suggest possible conditions (2-4), risk level (low/medium/high), and suggested tests. Be concise.
Format your response as:
"Possible conditions: ...
Risk level: ...
Suggested tests: ..."
Also add exactly one of these lines if any apply (otherwise omit):
"Risk flags: REPEATED_PATTERN" - if symptoms suggest a recurring or repeated pattern.
"Risk flags: CHRONIC_INDICATORS" - if symptoms suggest an ongoing or chronic condition.
"Risk flags: HIGH_RISK_COMBINATION" - if the combination of symptoms, age, or history is especially concerning.
"Risk flags: none" - if none of the above.
Do not diagnose; recommend seeing a doctor.`;
  const userContent = [
    `Symptoms: ${symptoms}. Age: ${age || 'not provided'}. Gender: ${gender || 'not provided'}. Medical history: ${history || 'none provided'}.`,
    previousChecksSummary ? `Previous symptom checks for this patient: ${previousChecksSummary}` : '',
  ].filter(Boolean).join('\n');
  const result = await callGemini(systemPrompt, userContent);
  if (result && result.text) {
    const riskLevel = result.text.toLowerCase().includes('high') ? 'high' : result.text.toLowerCase().includes('medium') ? 'medium' : 'low';
    const riskFlags = parseRiskFlags(result.text);
    return { success: true, aiResponse: result.text, riskLevel, riskFlags, model: result.model };
  }
  return { success: false, aiResponse: 'AI is temporarily unavailable. Please consult the doctor and note symptoms for manual review.', riskLevel: 'low', riskFlags: [], model: null };
};

exports.getRiskFlagLabel = (key) => RISK_FLAG_LABELS[key] || key;

exports.prescriptionExplanation = async (medicines, instructions, language = 'en') => {
  const medText = medicines.map((m) => `${m.name}: ${m.dosage} ${m.frequency} ${m.duration}`).join('; ');
  const systemPrompt = language === 'ur'
    ? 'You are a medical assistant. Explain this prescription in simple Urdu for the patient. Include brief lifestyle recommendations and preventive advice. Keep it short (3-5 sentences).'
    : 'You are a medical assistant. Explain this prescription in simple language for the patient. Include brief lifestyle recommendations and preventive advice. Keep it short (3-5 sentences).';
  const userContent = `Medicines: ${medText}. Instructions: ${instructions || 'None'}.`;
  const result = await callGemini(systemPrompt, userContent);
  if (result && result.text) return { success: true, explanation: result.text, model: result.model };
  return { success: false, explanation: 'Explanation is not available at the moment. Please follow the dosage as prescribed.', model: null };
};
