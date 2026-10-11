const SUPABASE_URL = process.env.SUPABASE_URL || 'https://uibzmqioeumuhczljolu.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_rSRn52GyErhIZbjGicxfYw_3myRbrbx';
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
const rateLimits = new Map();

function send(res, status, body) {
  res.setHeader('Cache-Control', 'no-store');
  return res.status(status).json(body);
}

function allowed(userId) {
  const now = Date.now();
  let entry = rateLimits.get(userId);
  if (!entry || now - entry.time > 60000) entry = { time: now, count: 0 };
  entry.count += 1;
  rateLimits.set(userId, entry);
  return entry.count <= 15;
}

async function getUser(token) {
  if (!token || !SUPABASE_KEY) return null;
  const response = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
    headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${token}` }
  });
  if (!response.ok) return null;
  return response.json();
}

function cleanObject(value, maxLength = 12000) {
  try { return JSON.stringify(value ?? null).slice(0, maxLength); }
  catch { return 'null'; }
}

function buildHistory(history) {
  if (!Array.isArray(history)) return [];
  return history
    .filter(item => item && typeof item.content === 'string' && (item.role === 'user' || item.role === 'assistant'))
    .slice(-20)
    .map(item => ({
      role: item.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: item.content.slice(0, 3000) }]
    }));
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return send(res, 405, { error: 'METHOD_NOT_ALLOWED' });
  if (!GEMINI_API_KEY) {
    console.error('GEMINI_API_KEY is missing in Vercel Environment Variables.');
    return send(res, 503, { error: 'AI_NOT_CONFIGURED', details: 'Add GEMINI_API_KEY in Vercel Environment Variables, then redeploy.' });
  }

  try {
    const authorization = req.headers.authorization || '';
    const token = authorization.startsWith('Bearer ') ? authorization.slice(7) : '';
    const user = await getUser(token);
    if (!user?.id) return send(res, 401, { error: 'UNAUTHORIZED' });
    if (!allowed(user.id)) return send(res, 429, { error: 'RATE_LIMITED', details: 'Too many messages. Wait one minute and try again.' });

    const body = req.body || {};
    const message = typeof body.message === 'string' ? body.message.trim() : '';
    if (!message) return send(res, 400, { error: 'MESSAGE_REQUIRED' });
    if (message.length > 4000) return send(res, 400, { error: 'MESSAGE_TOO_LONG' });

    const language = body.language === 'ar' ? 'ar' : 'en';
    const systemInstruction = [
      'You are IRONX AI Coach, an AI fitness assistant.',
      'Give practical, clear advice about training, exercise technique, nutrition, calories, recovery, sleep, and general fitness.',
      'Use the supplied profile and plans as context, but never claim that missing data exists. Distinguish general advice from the user’s actual plan.',
      'Do not diagnose injuries or diseases. For serious pain, chest pain, fainting, breathing difficulty, or dangerous symptoms, recommend prompt medical care.',
      'Never claim to be a human coach. Keep answers concise and useful.',
      `Reply in ${language === 'ar' ? 'Arabic (Egyptian Arabic when natural)' : 'English'}.`,
      `User profile: ${cleanObject(body.profile, 5000)}`,
      `Current training plan: ${cleanObject(body.trainingPlan, 8000)}`,
      `Current nutrition plan: ${cleanObject(body.nutritionPlan, 8000)}`
    ].join('\n\n');

    const contents = buildHistory(body.history);
    // Avoid duplicating the current message if the browser already included it in history.
    if (contents.length && contents[contents.length - 1].role === 'user' && contents[contents.length - 1].parts?.[0]?.text === message) {
      contents.pop();
    }
    contents.push({ role: 'user', parts: [{ text: message }] });

    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(GEMINI_MODEL)}:generateContent?key=${encodeURIComponent(GEMINI_API_KEY)}`;
    const upstream = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: systemInstruction }] },
        contents,
        generationConfig: { maxOutputTokens: 800, temperature: 0.7 }
      })
    });

    const data = await upstream.json().catch(() => ({}));
    if (!upstream.ok) {
      const providerMessage = data?.error?.message || 'The AI provider rejected the request.';
      console.error('Gemini provider error:', upstream.status, data?.error?.status, providerMessage);
      return send(res, 502, {
        error: 'AI_PROVIDER_ERROR',
        details: providerMessage.slice(0, 500),
        status: data?.error?.status || 'PROVIDER_ERROR',
        code: data?.error?.code || upstream.status
      });
    }

    const reply = (data?.candidates?.[0]?.content?.parts || [])
      .map(part => typeof part?.text === 'string' ? part.text : '')
      .join('')
      .trim();
    if (!reply) {
      console.error('Gemini returned no text. Finish reason:', data?.candidates?.[0]?.finishReason || 'unknown');
      return send(res, 502, { error: 'AI_EMPTY_RESPONSE', details: 'The AI provider returned an empty response. Try a shorter message.' });
    }
    return send(res, 200, { reply });
  } catch (error) {
    console.error('AI server error:', error?.message || error);
    return send(res, 500, { error: 'AI_SERVER_ERROR', details: 'The AI request failed on the server. Check the Vercel function logs.' });
  }
};
