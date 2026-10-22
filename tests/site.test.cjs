const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const css = fs.readFileSync(path.join(root, 'assets/styles.css'), 'utf8');
const js = fs.readFileSync(path.join(root, 'assets/app.js'), 'utf8');

test('required static site files exist', () => {
  for (const file of ['index.html', 'assets/styles.css', 'assets/app.js', 'assets/favicon.svg', 'README-AR.md']) {
    assert.ok(fs.existsSync(path.join(root, file)), `Missing ${file}`);
  }
});
test('page has Arabic default, responsive viewport, and language toggle', () => {
  assert.match(html, /<html lang="ar" dir="rtl">/);
  assert.match(html, /name="viewport"/);
  assert.match(html, /id="languageToggle"/);
  assert.match(js, /setLanguage\('ar'\)/);
  assert.match(js, /document\.documentElement\.dir = next === 'ar' \? 'rtl' : 'ltr'/);
});
test('WhatsApp contact uses the normalized Egypt number and prefilled messages', () => {
  assert.match(js, /const PHONE = '201112492372'/);
  assert.match(js, /https:\/\/wa\.me\/\$\{PHONE\}\?text=/);
  assert.match(html, /data-wa="header"/);
  assert.match(html, /data-wa="training"/);
  assert.match(html, /data-wa="nutrition"/);
});
test('no Supabase, database, auth, or internal chat dependencies are shipped', () => {
  const files = [];
  function walk(dir) { for (const entry of fs.readdirSync(dir, { withFileTypes: true })) { const p = path.join(dir, entry.name); if (entry.isDirectory()) walk(p); else files.push(p); } }
  walk(root);
  const source = files.filter(f => !f.includes(`${path.sep}tests${path.sep}`)).map(f => fs.readFileSync(f, 'utf8')).join('\n');
  assert.doesNotMatch(source, /supabase\.co|createClient\(|SUPABASE_SERVICE_ROLE_KEY|firebase\.app|socket\.io/i);
  assert.doesNotMatch(source, /api\/ai-chat|coach_messages|client dashboard/i);
});
test('mobile-first layout and accessible reduced motion rules are present', () => {
  assert.match(css, /@media\(max-width:680px\)/);
  assert.match(css, /@media\(prefers-reduced-motion:reduce\)/);
  assert.match(html, /aria-expanded="false"/);
});
