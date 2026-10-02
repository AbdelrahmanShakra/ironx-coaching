const crypto = require('crypto');

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://uibzmqioeumuhczljolu.supabase.co';
const SUPABASE_PUBLISHABLE_KEY = process.env.SUPABASE_PUBLISHABLE_KEY || '';
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || '';
const OPENAI_MODEL = process.env.OPENAI_MODEL || 'gpt-6-luna';

const buckets = new Map();
function allowed(key) {
  const now = Date.now();
  const entry = buckets.get(key) || { start: now, count: 0 };
  if (now - entry.start > 60_000) { entry.start = now; entry.count = 0; }
  entry.count += 1;
  buckets.set(key, entry);
  return entry.count <= 12;
}

function send(res, status, body) {
  res.status(status).json(body);
}

async function getUser(accessToken) {
  if (!accessToken || !SUPABASE_PUBLISHABLE_KEY) return null;
  const response = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
    headers: {
      apikey: SUPABASE_PUBLISHABLE_KEY,
      Authorization: `Bearer ${accessToken}`
    }
  });
  if (!response.ok) return null;
  return response.json();
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return send(res, 405, { error: 'METHOD_NOT_ALLOWED' });
  if (!OPENAI_API_KEY) return send(res, 503, { error: 'AI_NOT_CONFIGURED' });

  const auth = String(req.headers.authorization || '');
  const accessToken = auth.startsWith('Bearer ') ? auth.slice(7) : '';
  const user = await getUser(accessToken);
  if (!user?.id) return send(res, 401, { error: 'UNAUTHORIZED' });

  const rateKey = crypto.createHash('sha256').update(user.id).digest('hex');
  if (!allowed(rateKey)) return send(res, 429, { error: 'RATE_LIMITED' });

  const message = typeof req.body?.message === 'string' ? req.body.message.trim() : '';
  if (!message) return send(res, 400, { error: 'MESSAGE_REQUIRED' });
  if (message.length > 4000) return send(res, 400, { error: 'MESSAGE_TOO_LONG' });

  const response = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${OPENAI_API_KEY}`
    },
    body: JSON.stringify({
      model: OPENAI_MODEL,
      instructions: 'You are the IRONX AI Coach. Give concise, practical general fitness guidance. Do not diagnose medical conditions or replace a doctor. If a user reports significant pain, injury, fainting, chest pain, severe symptoms, or another urgent medical issue, recommend appropriate medical evaluation. Never claim to be the user\'s human coach.',
      input: [{ role: 'user', content: message }],
      max_output_tokens: 700
    })
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    console.error('OpenAI error:', data);
    return send(res, 502, { error: 'AI_REQUEST_FAILED' });
  }

  return send(res, 200, { reply: data.output_text || 'No response was returned.' });
};
