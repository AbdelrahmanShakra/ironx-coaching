const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const required = [
  'index.html', 'package.json', 'vercel.json', '.env.example', 'server.js',
  'api/health.js', 'api/ai-chat.js', 'api/register.js', 'api/issue-code.js',
  'api/onboarding/generate-plan.js', 'lib/supabase-admin.js', 'supabase-schema.sql'
];
const missing = required.filter(p => !fs.existsSync(path.join(root, p)) || fs.statSync(path.join(root, p)).size === 0);
if (missing.length) { console.error('Missing or empty files:', missing.join(', ')); process.exit(1); }
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
for (const marker of ['/api/onboarding/generate-plan', '/api/ai-chat', 'saveGeneratedTrainingPlan', 'saveGeneratedNutritionPlan']) {
  if (!html.includes(marker)) { console.error('Frontend integration marker missing:', marker); process.exitCode = 1; }
}
const cfg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
if (!cfg.dependencies?.express || !cfg.dependencies?.helmet) { console.error('Required runtime dependencies missing'); process.exitCode = 1; }
if (!process.exitCode) console.log(`IRONX file/integration checks passed (${required.length} required files).`);
