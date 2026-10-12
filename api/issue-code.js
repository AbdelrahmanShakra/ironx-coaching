const crypto = require('crypto');
const { send, admin, userFromToken } = require('../lib/supabase-admin');
module.exports = async (req,res) => {
  if(req.method!=='POST') return send(res,405,{error:'METHOD_NOT_ALLOWED'});
  try {
    const token=String(req.headers.authorization||'').replace(/^Bearer\s+/i,'');
    const user=await userFromToken(token);
    if(!user?.id) return send(res,401,{error:'UNAUTHORIZED'});
    const rows=await admin('/rest/v1/profiles?id=eq.'+encodeURIComponent(user.id)+'&select=role&limit=1');
    if(!Array.isArray(rows)||rows[0]?.role!=='coach') return send(res,403,{error:'COACH_ONLY'});
    const chunk=()=>crypto.randomBytes(4).toString('hex').slice(0,5).toUpperCase();
    const code=`IX-${chunk()}-${chunk()}`;
    const expires=new Date(Date.now()+5*60*1000).toISOString();
    await admin('/rest/v1/ironx_verification_codes',{method:'POST',headers:{Prefer:'return=minimal'},body:JSON.stringify({code,created_by:user.id,expires_at:expires})});
    return send(res,200,{code,expires_at:expires});
  } catch(e) { return send(res,e.status&&e.status<500?e.status:500,{error:e.message||'Could not create code'}); }
};
