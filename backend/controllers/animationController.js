'use strict';

const geminiService              = require('../services/geminiService');
const { validateAnimationJSON }  = require('../validators/animationValidator');
const { enrichAnimation }        = require('../processors/AnimationEnricher');

const NODE_ENV             = process.env.NODE_ENV || 'development';
const MAX_DESCRIPTION_LEN  = 1000;

async function generateAnimation(req, res, next) {
  try {
    const { description } = req.body;

    // ── Input validation ────────────────────────────────────────────────────
    if (!description || typeof description !== 'string' || !description.trim()) {
      return res.status(400).json({
        error:   'Validation error',
        details: 'Request body must include a non-empty "description" string.'
      });
    }

    const trimmed = description.trim();

    if (trimmed.length > MAX_DESCRIPTION_LEN) {
      return res.status(400).json({
        error:   'Validation error',
        details: 'Description must be ' + MAX_DESCRIPTION_LEN + ' characters or fewer. Got: ' + trimmed.length + '.'
      });
    }

    if (NODE_ENV === 'development') {
      console.log('[Controller] Prompt:', trimmed.slice(0, 80) + (trimmed.length > 80 ? '…' : ''));
    }

    // ── Step 1: AI generation ───────────────────────────────────────────────
    const rawJSON = await geminiService.generateAnimationJSON(trimmed);

    // ── Step 2: Schema validation ───────────────────────────────────────────
    const validation = validateAnimationJSON(rawJSON);
    if (!validation.valid) {
      if (NODE_ENV === 'development') console.error('[Controller] Validation failed:', validation.errors);
      return res.status(422).json({
        error:   'AI returned invalid animation JSON',
        details: validation.errors
      });
    }

    // ── Step 3: Physics enrichment ──────────────────────────────────────────
    let finalJSON = rawJSON;
    try {
      finalJSON = enrichAnimation(rawJSON);
      if (NODE_ENV === 'development') {
        const enriched = (finalJSON.timeline || []).filter(a => a.keyframes).length;
        if (enriched > 0) console.log('[Controller] Physics enriched ' + enriched + ' animation(s).');
      }
    } catch (enrichErr) {
      // Enrichment failure is non-fatal — serve the raw validated JSON
      if (NODE_ENV === 'development') console.error('[Controller] Enrichment error (non-fatal):', enrichErr.message);
    }

    return res.status(200).json({ animation: finalJSON });

  } catch (err) {
    next(err);
  }
}

module.exports = { generateAnimation }; 