'use strict';
const fs = require('fs');
const path = require('path');
const root = process.cwd();
function read(p) { return fs.readFileSync(path.join(root, p), 'utf8'); }
function write(p, s) { fs.writeFileSync(path.join(root, p), s, 'utf8'); }

// Patch the existing full index.html in place; do not replace it with a shortened template.
const indexPath = path.join(root, 'index.html');
if (!fs.existsSync(indexPath)) throw new Error('Run this from the extracted IRONX project root (index.html not found).');
let html = read('index.html');
const close = '</body>\n</html>';
if (!html.includes('</body>') || !html.includes('</html>')) throw new Error('index.html is missing its closing body/html tags; no files changed.');
if (!html.includes('src="/ironx-ui-fixes.js"')) {
  const scripts = '  <!-- IRONX recovery patches: loaded after the main app script. -->\n  <script src="/ironx-ui-fixes.js" defer></script>\n  <script src="/ironx-fix.js" defer></script>\n\n';
  html = html.replace('</body>', scripts + '</body>');
  write('index.html', html);
}

// The AI endpoints use Gemini, not OpenAI. This file is an example only; never paste real secrets into GitHub.
write('.env.example', [
  'SUPABASE_URL=https://uibzmqioeumuhczljolu.supabase.co',
  'SUPABASE_PUBLISHABLE_KEY=your_supabase_publishable_key',
  'SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key',
  'GEMINI_API_KEY=your_gemini_api_key',
  'GEMINI_MODEL=gemini-2.5-flash',
  ''
].join('\n'));

// Ensure activation-code panel works during local Express development too.
let server = read('server.js');
if (!server.includes("'/api/verification-codes': require('./api/verification-codes')")) {
  const anchor = "  '/api/issue-code': require('./api/issue-code'),";
  if (!server.includes(anchor)) throw new Error('server.js route anchor not found; index/env may already be patched, inspect server.js manually.');
  server = server.replace(anchor, anchor + "\n  '/api/verification-codes': require('./api/verification-codes'),");
  write('server.js', server);
}
console.log('IRONX patch applied: index.html references both recovery scripts, .env.example matches Gemini, local verification-code route added.');
console.log('Next: set GEMINI_API_KEY in Vercel Environment Variables and redeploy.');
