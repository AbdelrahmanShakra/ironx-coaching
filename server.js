const express = require("express");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const path = require("path");

const app = express();

app.use(
  helmet({
    contentSecurityPolicy: false
  })
);

app.use(express.json({ limit: "100kb" }));
app.use(express.urlencoded({ extended: true }));

app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 120,
    standardHeaders: true,
    legacyHeaders: false
  })
);

// Serve the website
app.use(express.static(__dirname));

// Health check
app.get("/api/health", (req, res) => {
  res.json({
    ok: true,
    message: "IRONX Coaching server is running"
  });
});

// All unknown routes go to index.html
app.use((req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

module.exports = app;
