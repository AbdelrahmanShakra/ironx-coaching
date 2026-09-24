const express = require('express');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const app = express();

const DATA = path.join(__dirname, 'data.json');

if (!fs.existsSync(DATA)) {
  fs.writeFileSync(
    DATA,
    JSON.stringify(
      { users: [], sessions: {}, checkins: [] },
      null,
      2
    )
  );
}

const read = () =>
  JSON.parse(fs.readFileSync(DATA, 'utf8'));

const write = (d) =>
  fs.writeFileSync(DATA, JSON.stringify(d, null, 2));

const hash = (
  p,
  s = crypto.randomBytes(16).toString('hex')
) =>
  `${s}:${crypto.scryptSync(p, s, 64).toString('hex')}`;

const verify = (p, h) => {
  try {
    const [s, x] = h.split(':');

    return crypto.timingSafeEqual(
      Buffer.from(x, 'hex'),
      crypto.scryptSync(p, s, 64)
    );
  } catch {
    return false;
  }
};

app.use(
  helmet({
    contentSecurityPolicy: false
  })
);

app.use(express.json({ limit: '100kb' }));
app.use(express.urlencoded({ extended: true }));

app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 120,
    standardHeaders: true,
    legacyHeaders: false
  })
);

app.use(express.static(__dirname));

function auth(req, res, next) {
  const token = (req.headers.authorization || '')
    .replace('Bearer ', '');

  const d = read();
  const uid = d.sessions[token];
  const u = d.users.find(x => x.id === uid);

  if (!u) {
    return res.status(401).json({
      error: 'Unauthorized'
    });
  }

  req.user = u;
  next();
}

/* =========================
   AUTO CREATE COACH ACCOUNT
   ========================= */

function ensureCoach() {
  const email = process.env.COACH_EMAIL;
  const password = process.env.COACH_PASSWORD;
  const name = process.env.COACH_NAME || 'IRONX Coach';

  if (!email || !password) {
    return;
  }

  const d = read();

  const existing = d.users.find(
    u =>
      u.email.toLowerCase() ===
      email.toLowerCase()
  );

  if (existing) {
    existing.role = 'coach';
    existing.name = name;
    existing.password = hash(password);

    write(d);
    return;
  }

  d.users.push({
    id: crypto.randomUUID(),
    name,
    email: email.toLowerCase(),
    password: hash(password),
    role: 'coach',
    age: '',
    goal: '',
    createdAt: new Date().toISOString(),
    plan: {
      training: '',
      nutrition: ''
    }
  });

  write(d);
}

ensureCoach();

/* =========================
   REGISTER
   ========================= */

app.post('/api/register', (req, res) => {
  const {
    name,
    email,
    password,
    age,
    goal
  } = req.body || {};

  if (!name || !email || !password) {
    return res.status(400).json({
      error: 'Name, email and password are required'
    });
  }

  if (password.length < 6) {
    return res.status(400).json({
      error: 'Password must be at least 6 characters'
    });
  }

  const d = read();

  if (
    d.users.some(
      u =>
        u.email.toLowerCase() ===
        email.toLowerCase()
    )
  ) {
    return res.status(409).json({
      error: 'Email already registered'
    });
  }

  const u = {
    id: crypto.randomUUID(),
    name,
    email: email.toLowerCase(),
    password: hash(password),
    role: 'client',
    age: age || '',
    goal: goal || '',
    createdAt: new Date().toISOString(),
    plan: {
      training:
        'Your training plan will appear here.',
      nutrition:
        'Your nutrition plan will appear here.'
    }
  };

  d.users.push(u);
  write(d);

  res.json({
    ok: true,
    message: 'Account created'
  });
});

/* =========================
   LOGIN
   ========================= */

app.post('/api/login', (req, res) => {
  const { email, password } = req.body || {};

  const d = read();

  const u = d.users.find(
    x =>
      x.email ===
      String(email || '').toLowerCase()
  );

  if (!u || !verify(password || '', u.password)) {
    return res.status(401).json({
      error: 'Invalid email or password'
    });
  }

  const token = crypto.randomBytes(32).toString('hex');

  d.sessions[token] = u.id;

  write(d);

  res.json({
    token,
    user: {
      id: u.id,
      name: u.name,
      email: u.email,
      role: u.role,
      age: u.age,
      goal: u.goal,
      plan: u.plan
    }
  });
});

/* =========================
   CURRENT USER
   ========================= */

app.get('/api/me', auth, (req, res) => {
  res.json({
    user: {
      id: req.user.id,
      name: req.user.name,
      email: req.user.email,
      role: req.user.role,
      age: req.user.age,
      goal: req.user.goal,
      plan: req.user.plan
    }
  });
});

/* =========================
   CHECK-IN
   ========================= */

app.post('/api/checkin', auth, (req, res) => {
  const {
    weight,
    waist,
    energy,
    notes
  } = req.body || {};

  const d = read();

  d.checkins.push({
    id: crypto.randomUUID(),
    userId: req.user.id,
    weight,
    waist,
    energy,
    notes,
    date: new Date().toISOString()
  });

  write(d);

  res.json({ ok: true });
});

/* =========================
   GET CHECK-INS
   ========================= */

app.get('/api/checkins', auth, (req, res) => {
  res.json({
    checkins: read()
      .checkins
      .filter(c => c.userId === req.user.id)
      .sort((a, b) =>
        b.date.localeCompare(a.date)
      )
  });
});

/* =========================
   COACH CLIENTS
   ========================= */

app.get('/api/coach/clients', auth, (req, res) => {
  if (req.user.role !== 'coach') {
    return res.status(403).json({
      error: 'Forbidden'
    });
  }

  const d = read();

  res.json({
    clients: d.users
      .filter(u => u.role === 'client')
      .map(u => ({
        id: u.id,
        name: u.name,
        email: u.email,
        age: u.age,
        goal: u.goal,
        createdAt: u.createdAt
      }))
  });
});

/* =========================
   MANUAL COACH SEED
   ========================= */

app.post('/api/coach/seed', (req, res) => {
  const key = req.headers['x-coach-key'];

  if (key !== process.env.COACH_PASSWORD) {
    return res.status(403).json({
      error: 'Forbidden'
    });
  }

  ensureCoach();

  res.json({
    ok: true,
    message: 'Coach account ready'
  });
});

/* =========================
   FRONTEND
   ========================= */

app.use((req, res) => {
  res.sendFile(
    path.join(__dirname, 'index.html')
  );
});

module.exports = app;
