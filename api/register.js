const { URL, PUB, send, admin } = require('../lib/supabase-admin');
module.exports = async (req,res) => {
  if (req.method !== 'POST') return send(res,405,{error:'METHOD_NOT_ALLOWED'});
  let createdId = null;
  try {
    const b=req.body||{}, name=String(b.name||'').trim().slice(0,100), email=String(b.email||'').trim().toLowerCase(), password=b.password, code=String(b.code||'').trim().toUpperCase();
    if(name.length<2) return send(res,400,{error:'اكتب اسمك الكامل.'});
    if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return send(res,400,{error:'البريد الإلكتروني غير صحيح.'});
    if(typeof password!=='string'||password.length<8) return send(res,400,{error:'كلمة المرور لازم تكون 8 أحرف على الأقل.'});
    if(!/^IX-[A-Z0-9]{5}-[A-Z0-9]{5}$/.test(code)) return send(res,400,{error:'اكتب كود التفعيل الذي أعطاه لك الكوتش.'});
    const now=new Date().toISOString();
    const found=await admin('/rest/v1/ironx_verification_codes?code=eq.'+encodeURIComponent(code)+'&used_at=is.null&expires_at=gt.'+encodeURIComponent(now)+'&select=id&limit=1');
    const row=Array.isArray(found)?found[0]:null;
    if(!row) return send(res,400,{error:'كود التفعيل غير صحيح أو انتهت صلاحيته أو استُخدم من قبل.'});
    const user=await admin('/auth/v1/admin/users',{method:'POST',body:JSON.stringify({email,password,email_confirm:true,user_metadata:{full_name:name}})});
    createdId=user.id; if(!createdId) throw new Error('Supabase did not return a user id.');
    await admin('/rest/v1/profiles?on_conflict=id',{method:'POST',headers:{Prefer:'resolution=merge-duplicates,return=minimal'},body:JSON.stringify({id:createdId,full_name:name,role:'client'})});
    const login=await fetch(URL+'/auth/v1/token?grant_type=password',{method:'POST',headers:{apikey:PUB,Authorization:'Bearer '+PUB,'Content-Type':'application/json'},body:JSON.stringify({email,password})});
    const session=await login.json().catch(()=>null);
    if(!login.ok) throw new Error(session?.msg||session?.message||session?.error_description||'تم إنشاء الحساب لكن تعذر بدء الجلسة. جرّب تسجيل الدخول.');
    const claimed=await admin('/rest/v1/ironx_verification_codes?id=eq.'+row.id+'&used_at=is.null&expires_at=gt.'+encodeURIComponent(new Date().toISOString()),{method:'PATCH',headers:{Prefer:'return=representation'},body:JSON.stringify({used_at:new Date().toISOString(),used_email:email})});
    if(!Array.isArray(claimed)||!claimed.length) throw Object.assign(new Error('كود التفعيل اتستخدم في نفس اللحظة. اطلب كودًا جديدًا.'),{status:409});
    return send(res,200,{access_token:session.access_token,refresh_token:session.refresh_token,user:session.user});
  } catch(e) {
    if(createdId) { try { await admin('/auth/v1/admin/users/'+encodeURIComponent(createdId),{method:'DELETE'}); } catch(_){} }
    const m=String(e.message||'Registration failed');
    return send(res,e.status&&e.status<500?e.status:500,{error:/already registered|already been registered/i.test(m)?'البريد ده عليه حساب بالفعل. سجّل دخول بدل إنشاء حساب جديد.':m});
  }
};
