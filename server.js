const express = require('express');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');

const app = express();
app.disable('x-powered-by');
app.use(helmet({ contentSecurityPolicy: false }));
app.use(express.json({ limit: '150kb' }));
app.use(rateLimit({ windowMs: 15 * 60 * 1000, max: 120, standardHeaders: true, legacyHeaders: false }));

// Local development adapter for the same serverless handlers used on Vercel.
const handlers = {
  '/api/health': require('./api/health'),
  '/api/ai-chat': require('./api/ai-chat'),
  '/api/register': require('./api/register'),
  '/api/issue-code': require('./api/issue-code'),
  '/api/onboarding/generate-plan': require('./api/onboarding/generate-plan')
};
for (const [route, handler] of Object.entries(handlers)) app.all(route, (req, res) => handler(req, res));
app.use(express.static(__dirname, { index: false, dotfiles: 'ignore' }));
app.get('/', (_req, res) => res.sendFile(path.join(__dirname, 'index.html')));
app.use('/api', (_req, res) => res.status(404).json({ error: 'API_NOT_FOUND' }));
app.get('*path', (_req, res) => res.sendFile(path.join(__dirname, 'index.html')));
const port = Number(process.env.PORT || 3000);
app.listen(port, () => console.log(`IRONX Coaching running on http://localhost:${port}`));
