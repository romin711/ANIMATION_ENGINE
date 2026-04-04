'use strict';

require('dotenv').config();

const express = require('express');
const cors = require('cors');
const animationRoutes = require('./routes/animationRoutes');

const app = express();
const PORT = process.env.PORT || 5000;
const NODE_ENV = process.env.NODE_ENV || 'development';

// ---------------------------------------------------------------------------
// CORS — open in dev, locked to FRONTEND_URL in production
// ---------------------------------------------------------------------------
const corsOptions = {
  origin: NODE_ENV === 'production'
    ? (process.env.FRONTEND_URL || false)
    : '*',
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type']
};
app.use(cors(corsOptions));

// ---------------------------------------------------------------------------
// Body parsing — 50kb limit keeps runaway prompts from bloating memory
// ---------------------------------------------------------------------------
app.use(express.json({ limit: '50kb' }));

// ---------------------------------------------------------------------------
// Routes
// ---------------------------------------------------------------------------
app.get('/health', function (req, res) {
  res.json({
    status: 'ok',
    message: 'AI Animation Backend is running',
    env: NODE_ENV,
    timestamp: new Date().toISOString()
  });
});

app.use('/api/animation', animationRoutes);

// 404 for anything else
app.use(function (req, res) {
  res.status(404).json({ error: 'Route not found' });
});

// ---------------------------------------------------------------------------
// Global error handler
// ---------------------------------------------------------------------------
app.use(function (err, req, res, next) { // eslint-disable-line no-unused-vars
  if (NODE_ENV === 'development') {
    console.error('[Server Error]', err.stack || err.message);
  } else {
    console.error('[Server Error]', err.message);
  }
  res.status(500).json({
    error: 'Internal server error',
    details: err.message
  });
});

// ---------------------------------------------------------------------------
// Process-level safety nets
// ---------------------------------------------------------------------------
process.on('unhandledRejection', function (reason) {
  console.error('[Unhandled Rejection]', reason);
});

process.on('uncaughtException', function (err) {
  console.error('[Uncaught Exception]', err.message);
  process.exit(1);
});

// ---------------------------------------------------------------------------
// Start
// ---------------------------------------------------------------------------
app.listen(PORT, function () {
  console.log('[Server] AI Animation Backend running on http://localhost:' + PORT + ' (' + NODE_ENV + ')');
});