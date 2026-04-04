'use strict';

const express = require('express');
const router = express.Router();
const animationController = require('../controllers/animationController');

// POST /api/animation/generate
// Body: { description: string }
router.post('/generate', animationController.generateAnimation);

module.exports = router;