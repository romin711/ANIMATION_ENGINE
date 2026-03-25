'use strict';

const geminiService = require('../services/geminiService');
const { validateAnimationJSON } = require('../validators/animationValidator');

/**
 * POST /api/animation/generate
 * Receives a user description, sends to Gemini API, validates, and returns animation JSON.
 */
async function generateAnimation(req, res, next) {
  try {
    const { description } = req.body;

    if (!description || typeof description !== 'string' || description.trim() === '') {
      return res.status(400).json({
        error: 'Validation error',
        details: 'Request body must include a non-empty "description" string.'
      });
    }

    console.log('[Controller] Generating animation for:', description);

    // Step 1: Call Gemini service
    const animationJSON = await geminiService.generateAnimationJSON(description.trim());

    // Step 2: Validate the returned JSON against our schema
    const validationResult = validateAnimationJSON(animationJSON);
    if (!validationResult.valid) {
      console.error('[Controller] Validation failed:', validationResult.errors);
      return res.status(422).json({
        error: 'AI returned invalid animation JSON',
        details: validationResult.errors
      });
    }

    // Step 3: Return validated animation JSON to frontend
    return res.status(200).json({ animation: animationJSON });

  } catch (err) {
    next(err);
  }
}

module.exports = { generateAnimation };
