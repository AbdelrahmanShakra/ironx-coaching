const assert = require('node:assert/strict');
process.env.GEMINI_API_KEY = 'test-only-key';
const handler = require('../api/onboarding/generate-plan');
function mockResponse() {
  return {
    statusCode: 200, headers: {}, body: null,
    setHeader(name, value) { this.headers[name] = value; return this; },
    status(code) { this.statusCode = code; return this; },
    json(body) { this.body = body; return this; }
  };
}
(async () => {
  let res = mockResponse();
  await handler({ method: 'GET', headers: {}, body: {} }, res);
  assert.equal(res.statusCode, 405, 'non-POST requests must be rejected');

  const originalFetch = global.fetch;
  global.fetch = async (url) => {
    if (String(url).includes('/auth/v1/user')) {
      return { ok: true, json: async () => ({ id: 'mock-user' }) };
    }
    if (String(url).includes('generativelanguage.googleapis.com')) {
      const plan = {
        training: { title: 'Mock training plan', exercises: [{ day_number: 1, exercise: 'Squat', sets: '3', reps: '8-12', rest: '90 sec', notes: '' }] },
        nutrition: { title: 'Mock nutrition plan', daily_calories: 2200, protein_g: 100, carbs_g: 280, fat_g: 70, meals_per_day: 3, water_liters: 2.5, meals: [{ meal_number: 1, name: 'Breakfast', foods: 'Eggs', calories: 500, protein_g: 25, carbs_g: 40, fat_g: 20 }] }
      };
      return { ok: true, json: async () => ({ candidates: [{ content: { parts: [{ text: JSON.stringify(plan) }] } }] }) };
    }
    throw new Error('Unexpected fetch URL: ' + url);
  };
  try {
    res = mockResponse();
    await handler({ method: 'POST', headers: { authorization: 'Bearer mock-token' }, body: { profile: { age: 25, weight_kg: 70, height_cm: 175, gender: 'male', goal: 'maintain' }, language: 'en' } }, res);
    assert.equal(res.statusCode, 200, 'valid authenticated request should return 200');
    assert.ok(res.body.training.exercises.length, 'training exercises should be returned');
    assert.ok(res.body.nutrition.meals.length, 'nutrition meals should be returned');
    assert.ok(res.body.calculations.target_calories > 0, 'calorie calculations should be returned');
  } finally {
    global.fetch = originalFetch;
  }
  console.log('generate-plan API tests passed (method guard, auth flow, response shape, calorie calculations).');
})().catch(error => { console.error(error); process.exit(1); });
