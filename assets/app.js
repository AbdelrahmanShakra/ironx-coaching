(() => {
  const langBtn=document.getElementById('lang');
  let lang='en';
  const messages={
    'A7A':{en:'Hi IRONX, I want to ask about the A7A PACKAGE.',ar:'أهلاً IRONX، عايز أستفسر عن باقة A7A.'},
    '3ANTEL ALMA7ALA':{en:'Hi IRONX, I want to ask about the 3ANTEL ALMA7ALA PACKAGE.',ar:'أهلاً IRONX، عايز أستفسر عن باقة 3ANTEL ALMA7ALA.'},
    'GORILLA':{en:'Hi IRONX, I want to ask about the GORILLA PACKAGE.',ar:'أهلاً IRONX، عايز أستفسر عن باقة GORILLA.'}
  };
  function setLang(next){
    lang=next;document.documentElement.lang=next;document.documentElement.dir=next==='ar'?'rtl':'ltr';
    document.querySelectorAll('[data-en][data-ar]').forEach(el=>{el.innerHTML=el.dataset[next]});
    langBtn.textContent=next==='en'?'عربي':'EN';
    document.querySelectorAll('[data-plan]').forEach(a=>{a.href='https://wa.me/201112492372?text='+encodeURIComponent(messages[a.dataset.plan][next])});
    document.title=next==='en'?'IRONX — Built With Intent':'IRONX — بهدف واضح';
  }
  langBtn.addEventListener('click',()=>setLang(lang==='en'?'ar':'en'));
  document.getElementById('copyInsta').addEventListener('click',async()=>{
    const btn=document.getElementById('copyInsta');
    try{await navigator.clipboard.writeText('01004876868')}catch(e){const x=document.createElement('textarea');x.value='01004876868';document.body.appendChild(x);x.select();document.execCommand('copy');x.remove()}
    btn.textContent=lang==='en'?'Copied':'تم النسخ';
    setTimeout(()=>btn.textContent=lang==='en'?'Copy number':'انسخ الرقم',1500);
  });
  document.getElementById('year').textContent=new Date().getFullYear();
  setLang('en');
})();