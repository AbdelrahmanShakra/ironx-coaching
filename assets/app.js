(() => {
  const langButton = document.getElementById('lang');
  let currentLang = 'ar';
  const waMessages = {
    A7A: { ar: 'أهلاً IRONX، عايز أعرف تفاصيل باقة A7A PACKAGE.', en: 'Hi IRONX, I would like details about the A7A PACKAGE.' },
    '3ANTEL ALMA7ALA': { ar: 'أهلاً IRONX، عايز أعرف تفاصيل باقة 3ANTEL ALMA7ALA PACKAGE.', en: 'Hi IRONX, I would like details about the 3ANTEL ALMA7ALA PACKAGE.' },
    GORILLA: { ar: 'أهلاً IRONX، عايز أعرف تفاصيل باقة GORILLA PACKAGE.', en: 'Hi IRONX, I would like details about the GORILLA PACKAGE.' }
  };
  function setLanguage(lang) {
    currentLang = lang;
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
    document.querySelectorAll('[data-ar][data-en]').forEach(el => {
      const val = el.dataset[lang];
      if (val !== undefined) el.innerHTML = val;
    });
    langButton.textContent = lang === 'ar' ? 'EN' : 'عربي';
    document.title = lang === 'ar' ? 'IRONX | الاشتراكات' : 'IRONX | Memberships';
    document.querySelectorAll('.plan-link').forEach(link => {
      const plan = link.dataset.plan;
      const message = encodeURIComponent(waMessages[plan][lang]);
      link.href = `https://wa.me/201112492372?text=${message}`;
    });
  }
  langButton.addEventListener('click', () => setLanguage(currentLang === 'ar' ? 'en' : 'ar'));
  document.getElementById('copyInsta').addEventListener('click', async () => {
    const number = '01004876868';
    const button = document.getElementById('copyInsta');
    try {
      await navigator.clipboard.writeText(number);
      button.textContent = currentLang === 'ar' ? 'تم نسخ الرقم' : 'Number copied';
    } catch {
      const field = document.createElement('textarea');
      field.value = number;
      field.style.position = 'fixed';
      field.style.opacity = '0';
      document.body.appendChild(field);
      field.select();
      document.execCommand('copy');
      field.remove();
      button.textContent = currentLang === 'ar' ? 'تم نسخ الرقم' : 'Number copied';
    }
    setTimeout(() => {
      button.textContent = currentLang === 'ar' ? 'انسخ الرقم' : 'Copy number';
    }, 1800);
  });
  document.getElementById('year').textContent = new Date().getFullYear();
  setLanguage('ar');
})();
