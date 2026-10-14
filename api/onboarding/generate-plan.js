const { URL, PUB, send } = require('../../lib/supabase-admin');
const API_KEY = process.env.GEMINI_API_KEY || '';
const MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash';

async function authenticatedUser(token) {
  if (!token) return null;
  const r = await fetch(URL + '/auth/v1/user', {
    headers: { apikey: PUB, Authorization: 'Bearer ' + token }
  });
  return r.ok ? r.json() : null;
}
function number(v, fallback) {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}
function targets(p) {
  const age = number(p.age, 25), weight = number(p.weight_kg, 70), height = number(p.height_cm, 170);
  const gender = String(p.gender || '').toLowerCase();
  const female = gender.includes('female') || gender.includes('أنثى');
  const a = String(p.activity_level || '').toLowerCase();
  const factor = /very_active|very active|مرتفع جدا/.test(a) ? 1.9 :
    /active|نشط|high/.test(a) ? 1.725 :
    /moderate|متوسط/.test(a) ? 1.55 :
    /light|خفيف/.test(a) ? 1.375 : 1.45;
  const bmr = 10 * weight + 6.25 * height - 5 * age + (female ? -161 : 5);
  const tdee = Math.round(bmr * factor);
  const goal = String(p.goal || 'maintain').toLowerCase();
  let calories = tdee;
  if (age >= 18 && /bulk|gain|muscle|زيادة/.test(goal)) calories += 200;
  if (age >= 18 && /cut|loss|lose|تنشيف|خسارة/.test(goal)) calories -= 250;
  calories = Math.max(female ? 1400 : 1500, Math.round(calories / 50) * 50);
  const protein = Math.round(weight * (age < 18 ? 1.4 : 1.6));
  const fat = Math.round(calories * 0.27 / 9);
  return {
    bmr: Math.round(bmr), tdee, target_calories: calories,
    macros: { protein_g: protein, fat_g: fat, carbs_g: Math.max(0, Math.round((calories - protein * 4 - fat * 9) / 4)) }
  };
}
function parseJSON(s) {
  s = String(s || '').trim();
  const a = s.indexOf('{'), b = s.lastIndexOf('}');
  if (a < 0 || b <= a) throw new Error('AI returned invalid JSON.');
  return JSON.parse(s.slice(a, b + 1));
}
module.exports = async function(req, res) {
  if (req.method !== 'POST') return send(res, 405, { error: 'METHOD_NOT_ALLOWED' });
  if (!API_KEY) return send(res, 503, {
    error: 'AI_NOT_CONFIGURED',
    details: 'Add GEMINI_API_KEY in Vercel Environment Variables, then redeploy.'
  });
  try {
    const token = String(req.headers.authorization || '').replace(/^Bearer\s+/i, '');
    const user = await authenticatedUser(token);
    if (!user || !user.id) return send(res, 401, { error: 'UNAUTHORIZED', details: 'Log in again and retry.' });
    const p = req.body && req.body.profile || {};
    const age = number(p.age, 0), weight = number(p.weight_kg, 0), height = number(p.height_cm, 0);
    if (age < 10 || age > 100 || weight < 25 || weight > 350 || height < 100 || height > 230) {
      return send(res, 400, { error: 'PROFILE_INCOMPLETE', details: 'Complete your age, weight, and height first.' });
    }
    const calc = targets(p);
    const profile = {
      age, gender: String(p.gender || 'not specified').slice(0, 40),
      weight_kg: weight, height_cm: height,
      activity_level: String(p.activity_level || 'not specified').slice(0, 80),
      goal: String(p.goal || 'maintain').slice(0, 80),
      experience: String(p.experience || p.training_experience || 'not specified').slice(0, 100),
      equipment: String(p.equipment || 'gym').slice(0, 120),
      food_preferences: String(p.dietary_preferences || p.food_preferences || 'affordable ordinary foods').slice(0, 250),
      allergies: String(p.allergies || 'not specified').slice(0, 250),
      budget: String(p.budget || 'budget-friendly').slice(0, 80)
    };
    const language = req.body && req.body.language === 'ar' ? 'Egyptian Arabic' : 'English';
    const prompt = [
      'Generate a practical safe fitness plan in ' + language + '. Return ONLY valid JSON with this shape:',
      '{"training":{"title":"string","description":"string","exercises":[{"day_number":1,"exercise":"string","sets":"3","reps":"8-12","rest":"90 sec","notes":"string"}]},"nutrition":{"title":"string","daily_calories":2000,"protein_g":120,"carbs_g":250,"fat_g":65,"meals_per_day":4,"water_liters":2.5,"goal":"maintain","notes":"string","meals":[{"meal_number":1,"name":"string","time":"string","foods":"foods and portions","calories":500,"protein_g":25,"carbs_g":60,"fat_g":15,"fiber_g":6,"notes":""}]}}',
      'Client profile: ' + JSON.stringify(profile),
      'Daily target: ' + JSON.stringify(calc),
      'Provide 3-5 training days based on experience, 12-24 exercise entries total, reasonable sets/reps/rest, warmups, rest days and safe technique notes. Never advise max attempts or training through pain.',
      'Provide 3-5 affordable meals using common foods and practical portions, with approximate macros. Avoid assuming supplements or expensive products. Keep nutrition totals close to the calculated target.',
      'For anyone under 18, do not prescribe aggressive weight loss, restrictive dieting or calorie deficits. Prioritize adequate food, healthy habits and recovery; recommend parent/qualified professional support for major diet changes.',
      'Never recommend steroids, unsafe supplements, dehydration or medical treatment. Respect allergies and food preferences. Return 3-5 meal entries and valid JSON.'
    ].join('\n\n');
    const url = 'https://generativelanguage.googleapis.com/v1beta/models/' + encodeURIComponent(MODEL) + ':generateContent?key=' + encodeURIComponent(API_KEY);
    const r = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: { responseMimeType: 'application/json', temperature: 0.35, maxOutputTokens: 5000 }
      })
    });
    const data = await r.json().catch(() => ({}));
    if (!r.ok) {
      console.error('Gemini onboarding error', r.status, data && data.error && data.error.status);
      return send(res, 502, {
        error: 'AI_PROVIDER_ERROR',
        details: String(data && data.error && data.error.message || 'AI provider rejected the request.').slice(0, 350)
      });
    }
    const parts = data && data.candidates && data.candidates[0] && data.candidates[0].content && data.candidates[0].content.parts || [];
    const generated = parseJSON(parts.map(x => x.text || '').join(''));
    if (!generated.training || !Array.isArray(generated.training.exercises) || !generated.training.exercises.length ||
        !generated.nutrition || !Array.isArray(generated.nutrition.meals) || !generated.nutrition.meals.length) {
      return send(res, 502, { error: 'AI_INVALID_PLAN', details: 'AI returned an incomplete plan. Retry.' });
    }
    generated.calculations = calc;
    generated.nutrition.daily_calories = number(generated.nutrition.daily_calories, calc.target_calories);
    generated.nutrition.protein_g = number(generated.nutrition.protein_g, calc.macros.protein_g);
    generated.nutrition.carbs_g = number(generated.nutrition.carbs_g, calc.macros.carbs_g);
    generated.nutrition.fat_g = number(generated.nutrition.fat_g, calc.macros.fat_g);
    return send(res, 200, generated);
  } catch (e) {
    console.error('Plan generation error', e && e.message || e);
    return send(res, 500, {
      error: 'PLAN_GENERATION_FAILED',
      details: String(e && e.message || 'Could not generate plans.').slice(0, 300)
    });
  }
};
