const { URL, PUB, send } = require('../lib/supabase-admin');
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
const rateLimits = new Map();
async function getUser(token) {
  if (!token) return null;
  const r = await fetch(`${URL}/auth/v1/user`, { headers: { apikey: PUB, Authorization: `Bearer ${token}` } });
  return r.ok ? r.json() : null;
}
function clean(v, max=7000) { try { return JSON.stringify(v ?? null).slice(0,max); } catch { return 'null'; } }
module.exports = async function(req,res) {
  if(req.method!=='POST') return send(res,405,{error:'METHOD_NOT_ALLOWED'});
  if(!GEMINI_API_KEY) return send(res,503,{error:'AI_NOT_CONFIGURED',details:'Add GEMINI_API_KEY in Vercel Environment Variables and redeploy.'});
  try {
    const token=String(req.headers.authorization||'').replace(/^Bearer\s+/i,'');
    const user=await getUser(token); if(!user?.id) return send(res,401,{error:'UNAUTHORIZED',details:'Your session expired. Log in again.'});
    const now=Date.now();let limit=rateLimits.get(user.id);if(!limit||now-limit.time>60000)limit={time:now,count:0};limit.count++;rateLimits.set(user.id,limit);if(limit.count>15)return send(res,429,{error:'RATE_LIMITED',details:'Wait one minute and try again.'});
    const body=req.body||{},message=typeof body.message==='string'?body.message.trim():'';if(!message)return send(res,400,{error:'MESSAGE_REQUIRED'});if(message.length>4000)return send(res,400,{error:'MESSAGE_TOO_LONG'});
    const language=body.language==='ar'?'Arabic (Egyptian Arabic when natural)':'English';
    const systemInstruction=[
      'You are IRONX AI Coach, an AI fitness assistant. Give clear, practical advice about training, exercise technique, nutrition, food planning, recovery, sleep and general fitness.',
      'Use supplied profile and assigned plans only as context; never pretend missing data exists. Never claim to be a human coach. Avoid extreme diets, dangerous training, and supplement/medication prescriptions.',
      'Do not diagnose injury or disease. For serious pain, chest pain, fainting, breathing difficulty or dangerous symptoms, recommend prompt medical care. For minors, prioritize safe age-appropriate habits and involve a parent/guardian and qualified professional for significant diet changes.',
      `Reply in ${language}. Keep responses structured and reasonably concise.`,
      `Profile: ${clean(body.profile,3000)}`,
      `Training plan: ${clean(body.trainingPlan,7000)}`,
      `Nutrition plan: ${clean(body.nutritionPlan,7000)}`
    ].join('\n\n');
    const history=Array.isArray(body.history)?body.history.filter(x=>x&&typeof x.content==='string'&&['user','assistant'].includes(x.role)).slice(-18).map(x=>({role:x.role==='assistant'?'model':'user',parts:[{text:x.content.slice(0,2500)}]})):[];
    if(history.at(-1)?.role==='user'&&history.at(-1)?.parts?.[0]?.text===message)history.pop();
    history.push({role:'user',parts:[{text:message}]});
    const endpoint=`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(GEMINI_MODEL)}:generateContent?key=${encodeURIComponent(GEMINI_API_KEY)}`;
    const upstream=await fetch(endpoint,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({systemInstruction:{parts:[{text:systemInstruction}]},contents:history,generationConfig:{maxOutputTokens:900,temperature:.65}})});
    const data=await upstream.json().catch(()=>({}));if(!upstream.ok){console.error('Gemini error',upstream.status,data?.error?.status,data?.error?.message);return send(res,502,{error:'AI_PROVIDER_ERROR',details:(data?.error?.message||'Gemini rejected the request').slice(0,400),status:data?.error?.status||'PROVIDER_ERROR'});}
    const reply=(data?.candidates?.[0]?.content?.parts||[]).map(p=>typeof p.text==='string'?p.text:'').join('').trim();if(!reply)return send(res,502,{error:'AI_EMPTY_RESPONSE',details:'The AI provider returned an empty response. Try a shorter question.'});
    return send(res,200,{reply});
  } catch(e) { console.error('AI endpoint error',e?.message||e);return send(res,500,{error:'AI_SERVER_ERROR',details:'The AI request failed. Check Vercel Function logs.'}); }
};
