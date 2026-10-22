(() => {
  'use strict';
  const PHONE = '201112492372';
  const translations = {
    ar: {
      title: 'IRONX — ابنِ نسختك الأقوى', navServices: 'الخدمات', navMethod: 'طريقتنا', navFaq: 'أسئلة شائعة', startNow: 'ابدأ الآن', eyebrow: 'تدريب أذكى. التزام أقوى.', heroTitle: 'مش مجرد تمرين.<br><em>دي نقلة لمستواك.</em>', heroDescription: 'خطط تدريب وتغذية ومتابعة عملية، مصممة حول هدفك وإمكانياتك. كل التفاصيل والتواصل مباشرة على واتساب.', talkWhatsApp: 'ابدأ محادثة على واتساب', exploreServices: 'اكتشف الخدمات', heroNote: 'تواصل مباشر، وخطة واضحة، وخطوات قابلة للاستمرار.', focusLabel: 'التركيز', focusValue: 'تقدم ثابت', approachLabel: 'المنهج', approachValue: 'خطة على مقاسك', trustOne: 'خطة مناسبة لهدفك', trustTwo: 'متابعة مباشرة', trustThree: 'كل شيء عبر واتساب', servicesEyebrow: 'خدمات IRONX', servicesTitle: 'كل اللي تحتاجه.<br><em>من غير تعقيد.</em>', servicesIntro: 'اختار نقطة البداية، وخلّي تفاصيل خطتك تتحدد في محادثة مباشرة.', trainingTitle: 'برامج التدريب', trainingText: 'تقسيمة وتمارين منظمة تناسب مستواك، وقتك، والأدوات المتاحة ليك.', nutritionTitle: 'التغذية', nutritionText: 'تنظيم وجبات عملي مبني على أكلك المتاح وهدفك، من غير حلول خيالية.', followTitle: 'المتابعة والتطوير', followText: 'مراجعة التقدم ومناقشة التعديلات معاك مباشرة في محادثة واتساب.', askService: 'اسأل عن الخدمة', methodEyebrow: 'ببساطة، دي طريقتنا', methodTitle: 'من أول رسالة،<br><em>لخطة واضحة.</em>', methodText: 'مفيش لوحات تحكم معقدة ولا شات داخل الموقع. كل التفاصيل بتتفق عليها مباشرة مع IRONX عبر واتساب.', startConversation: 'ابدأ محادثتك', stepOneTitle: 'ابعتلنا رسالة', stepOneText: 'قولنا هدفك وإيه اللي محتاجه.', stepTwoTitle: 'ناقش التفاصيل', stepTwoText: 'نتكلم عن مستواك والوقت والإمكانيات.', stepThreeTitle: 'ابدأ خطتك', stepThreeText: 'تتفقوا على الخدمة والخطوات التالية على واتساب.', faqEyebrow: 'قبل ما تبدأ', faqTitle: 'أسئلة <em>سريعة.</em>', faqIntro: 'تفاصيل واضحة من البداية، لأن التخمين مش خطة تدريب.', faqQ1: 'إزاي أبدأ مع IRONX؟ <span>+</span>', faqA1: 'اضغط على أي زر واتساب في الموقع، وابعتلنا هدفك والخدمة اللي مهتم بيها.', faqQ2: 'هل لازم أستخدم تطبيق أو أسجل حساب؟ <span>+</span>', faqA2: 'لا. الموقع للتعريف بالخدمات والتواصل فقط، والتفاصيل والمتابعة بتكون عبر واتساب.', faqQ3: 'هل الخطة واحدة لكل الناس؟ <span>+</span>', faqA3: 'لازم تناقش هدفك ومستواك وإمكانياتك قبل الاتفاق على أي خطة أو خدمة.', ctaEyebrow: 'خطوتك الأولى تبدأ هنا', ctaTitle: 'جاهز تبدأ؟<br><em>خلّينا نتكلم.</em>', ctaText: 'ابعت رسالة على واتساب، وابدأ بتحديد هدفك والخدمة المناسبة ليك.', footerText: 'قوة مبنية على خطة. خطوة بخطوة.', whatsappFloat: 'تواصل واتساب', waHeader: 'أهلًا IRONX، حابب أعرف تفاصيل الخدمات والاشتراك.', waHero: 'أهلًا IRONX، حابب أبدأ وأعرف أنسب خدمة لهدفي.', waTraining: 'أهلًا IRONX، حابب أعرف تفاصيل برامج التدريب.', waNutrition: 'أهلًا IRONX، حابب أعرف تفاصيل خدمات التغذية.', waFollow: 'أهلًا IRONX، حابب أعرف تفاصيل المتابعة والتطوير.', waMethod: 'أهلًا IRONX، حابب أبدأ وأناقش هدفي والخطة المناسبة.', waFinal: 'أهلًا IRONX، جاهز أبدأ. ممكن تفاصيل الخطوات التالية؟', waFooter: 'أهلًا IRONX، حابب أعرف تفاصيل الخدمات.', waFloating: 'أهلًا IRONX، حابب أتواصل معاكم.'
    },
    en: {
      title: 'IRONX — Build Your Stronger Self', navServices: 'Services', navMethod: 'Our Method', navFaq: 'FAQs', startNow: 'Get Started', eyebrow: 'Smarter training. Stronger commitment.', heroTitle: 'More than a workout.<br><em>A new level starts here.</em>', heroDescription: 'Practical training, nutrition, and check-ins shaped around your goals and resources. All details and communication happen directly on WhatsApp.', talkWhatsApp: 'Start a WhatsApp chat', exploreServices: 'Explore services', heroNote: 'Direct communication. A clear plan. Progress you can sustain.', focusLabel: 'THE FOCUS', focusValue: 'Steady progress', approachLabel: 'THE METHOD', approachValue: 'A plan built for you', trustOne: 'Goal-focused plans', trustTwo: 'Direct check-ins', trustThree: 'Everything via WhatsApp', servicesEyebrow: 'IRONX SERVICES', servicesTitle: 'What you need.<br><em>Without the noise.</em>', servicesIntro: 'Choose where to start. Discuss the details of your plan in a direct conversation.', trainingTitle: 'Training Programs', trainingText: 'Structured splits and workouts matched to your experience, schedule, and available equipment.', nutritionTitle: 'Nutrition', nutritionText: 'Practical meal planning based on your goals and the food you can actually access.', followTitle: 'Check-ins & Progress', followText: 'Review your progress and discuss adjustments directly in a WhatsApp conversation.', askService: 'Ask about this service', methodEyebrow: 'Simple by design', methodTitle: 'From the first message<br><em>to a clear plan.</em>', methodText: 'No complicated dashboards and no on-site chat. Discuss every detail directly with IRONX on WhatsApp.', startConversation: 'Start a conversation', stepOneTitle: 'Send a message', stepOneText: 'Tell us your goal and what you need.', stepTwoTitle: 'Discuss the details', stepTwoText: 'Talk through your experience, schedule, and resources.', stepThreeTitle: 'Start your plan', stepThreeText: 'Agree on the service and next steps on WhatsApp.', faqEyebrow: 'Before you start', faqTitle: 'Quick <em>answers.</em>', faqIntro: 'Clear expectations from the start. Guesswork is not a training plan.', faqQ1: 'How do I get started with IRONX? <span>+</span>', faqA1: 'Tap any WhatsApp button on the site and tell us your goal and which service interests you.', faqQ2: 'Do I need an app or an account? <span>+</span>', faqA2: 'No. This site introduces the services and connects you with us. Details and check-ins happen on WhatsApp.', faqQ3: 'Is the plan the same for everyone? <span>+</span>', faqA3: 'Your goals, experience, and resources should be discussed before agreeing on a plan or service.', ctaEyebrow: 'Your first step starts here', ctaTitle: 'Ready to start?<br><em>Let’s talk.</em>', ctaText: 'Message us on WhatsApp to discuss your goal and the service that fits.', footerText: 'Strength built on a plan. One step at a time.', whatsappFloat: 'Chat on WhatsApp', waHeader: 'Hi IRONX, I’d like to learn about your services and coaching.', waHero: 'Hi IRONX, I’m ready to start and would like help choosing a service.', waTraining: 'Hi IRONX, I’d like details about your training programs.', waNutrition: 'Hi IRONX, I’d like details about your nutrition services.', waFollow: 'Hi IRONX, I’d like details about check-ins and progress support.', waMethod: 'Hi IRONX, I’d like to discuss my goal and a suitable plan.', waFinal: 'Hi IRONX, I’m ready to get started. What are the next steps?', waFooter: 'Hi IRONX, I’d like to learn about your services.', waFloating: 'Hi IRONX, I’d like to get in touch.'
    }
  };
  const toggle = document.getElementById('languageToggle');
  const menuToggle = document.getElementById('menuToggle');
  const nav = document.querySelector('.desktop-nav');
  let language = 'ar';
  function setLanguage(next) {
    language = next;
    const dict = translations[next];
    document.documentElement.lang = next;
    document.documentElement.dir = next === 'ar' ? 'rtl' : 'ltr';
    document.body.classList.toggle('lang-en', next === 'en');
    document.title = dict.title;
    document.querySelectorAll('[data-i18n]').forEach((element) => {
      const key = element.dataset.i18n;
      if (Object.prototype.hasOwnProperty.call(dict, key)) element.innerHTML = dict[key];
    });
    toggle.innerHTML = next === 'ar' ? 'EN <span aria-hidden="true">↗</span>' : 'عربي <span aria-hidden="true">↗</span>';
    toggle.setAttribute('aria-label', next === 'ar' ? 'Switch language to English' : 'تغيير اللغة إلى العربية');
    menuToggle.setAttribute('aria-label', next === 'ar' ? 'فتح القائمة' : 'Open menu');
    document.querySelectorAll('[data-wa]').forEach((link) => {
      const key = `wa${link.dataset.wa.charAt(0).toUpperCase()}${link.dataset.wa.slice(1)}`;
      link.href = `https://wa.me/${PHONE}?text=${encodeURIComponent(dict[key] || dict.waHeader)}`;
    });
    document.querySelectorAll('.faq-list details').forEach((item) => { item.open = false; });
  }
  toggle.addEventListener('click', () => setLanguage(language === 'ar' ? 'en' : 'ar'));
  menuToggle.addEventListener('click', () => {
    const open = nav.classList.toggle('is-open');
    menuToggle.setAttribute('aria-expanded', String(open));
  });
  nav.querySelectorAll('a').forEach((link) => link.addEventListener('click', () => {
    nav.classList.remove('is-open');
    menuToggle.setAttribute('aria-expanded', 'false');
  }));
  document.getElementById('year').textContent = new Date().getFullYear();
  setLanguage('ar');
})();
