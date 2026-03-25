'use strict';

require('dotenv').config();

const express = require('express');
const cors = require('cors');
const animationRoutes = require('./routes/animationRoutes');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Health check route
app.get('/health', function (req, res) {
  res.json({ status: 'ok', message: 'AI Animation Backend is running' });
});

// Animation routes
app.use('/api/animation', animationRoutes);

// Global error handler
app.use(function (err, req, res, next) {
  console.error('[Server Error]', err.message);
  res.status(500).json({ error: 'Internal server error', details: err.message });
});

app.listen(PORT, function () {
  console.log('AI Animation Backend running on http://localhost:' + PORT);
});
