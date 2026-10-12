const URL = (process.env.SUPABASE_URL || 'https://uibzmqioeumuhczljolu.supabase.co').replace(/\/$/, '');
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY || '';
const PUB = process.env.SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || 'sb_publishable_rSRn52GyErhIZbjGicxfYw_3myRbrbx';
function send(res, status, body) { res.setHeader('Cache-Control','no-store'); return res.status(status).json(body); }
async function admin(path, options={}) {
  if (!KEY) throw Object.assign(new Error('Missing SUPABASE_SERVICE_ROLE_KEY in Vercel Environment Variables.'), {status:503});
  const r = await fetch(URL + path, { ...options, headers: { apikey: KEY, Authorization: `Bearer ${KEY}`, 'Content-Type':'application/json', ...(options.headers || {}) } });
  const body = await r.json().catch(() => null);
  if (!r.ok) throw Object.assign(new Error(body?.msg || body?.message || body?.error_description || body?.error || `Supabase returned ${r.status}`), {status:r.status});
  return body;
}
async function userFromToken(token) {
  if (!token) return null;
  const r = await fetch(`${URL}/auth/v1/user`, { headers: { apikey: PUB, Authorization: `Bearer ${token}` } });
  if (!r.ok) return null;
  return r.json();
}
module.exports = { URL, KEY, PUB, send, admin, userFromToken };
