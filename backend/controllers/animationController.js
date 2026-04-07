'use strict';

const geminiService = require('../services/geminiService');
const { buildAnimationFromPlan, selectBuilderKey } = require('../builders/buildAnimationFromPlan');
const { enrichAnimation } = require('../processors/AnimationEnricher');
const { classifyPrompt, normalizePrompt } = require('../processors/PromptClassifier');
const { validateAnimationJSON } = require('../validators/animationValidator');

const NODE_ENV = process.env.NODE_ENV || 'development';
const MAX_DESCRIPTION_LEN = 1000;
const MIN_DURATION_SECONDS = 1;
const MAX_DURATION_SECONDS = 30;

function roundTo(value, decimals) {
  const factor = Math.pow(10, decimals);
  return Math.round(value * factor) / factor;
}

function getAnimationSegmentDuration(anim) {
  const baseDuration = anim?.duration || 0;
  const repeatCount = anim?.repeat === -1 ? 0 : Math.max(0, anim?.repeat || 0);
  return baseDuration * (repeatCount + 1);
}

function getDisplayDuration(animationJSON) {
  const timeline = animationJSON?.timeline || [];
  if (timeline.length === 0) return 0;

  return timeline.reduce(function (maxDuration, anim) {
    const endTime = (anim?.delay || 0) + getAnimationSegmentDuration(anim);
    return Math.max(maxDuration, endTime);
  }, 0);
}

function applyRequestedDuration(animationJSON, requestedDuration) {
  if (!requestedDuration || !Number.isFinite(requestedDuration)) {
    return animationJSON;
  }

  const currentDuration = getDisplayDuration(animationJSON);
  if (currentDuration <= 0) {
    return animationJSON;
  }

  const scale = requestedDuration / currentDuration;
  if (!Number.isFinite(scale) || scale <= 0) {
    return animationJSON;
  }

  return Object.assign({}, animationJSON, {
    timeline: (animationJSON.timeline || []).map(function (anim) {
      return Object.assign({}, anim, {
        duration: roundTo((anim.duration || 0) * scale, 3),
        delay: roundTo((anim.delay || 0) * scale, 3)
      });
    })
  });
}

async function generateAnimation(req, res, next) {
  try {
    const { description, duration } = req.body;

    // ── Input validation ────────────────────────────────────────────────────
    if (!description || typeof description !== 'string' || !description.trim()) {
      return res.status(400).json({
        error:   'Validation error',
        details: 'Request body must include a non-empty "description" string.'
      });
    }

    const trimmed = normalizePrompt(description);

    if (trimmed.length > MAX_DESCRIPTION_LEN) {
      return res.status(400).json({
        error:   'Validation error',
        details: 'Description must be ' + MAX_DESCRIPTION_LEN + ' characters or fewer. Got: ' + trimmed.length + '.'
      });
    }

    let requestedDuration = null;
    if (duration !== undefined) {
      if (typeof duration !== 'number' || !Number.isFinite(duration)) {
        return res.status(400).json({
          error: 'Validation error',
          details: '"duration" must be a number when provided.'
        });
      }

      if (duration < MIN_DURATION_SECONDS || duration > MAX_DURATION_SECONDS) {
        return res.status(400).json({
          error: 'Validation error',
          details: '"duration" must be between ' + MIN_DURATION_SECONDS + ' and ' + MAX_DURATION_SECONDS + ' seconds.'
        });
      }

      requestedDuration = duration;
    }

    if (NODE_ENV === 'development') {
      console.log('[Controller] Prompt:', trimmed.slice(0, 80) + (trimmed.length > 80 ? '…' : ''));
    }

    const route = classifyPrompt(trimmed);

    let plan = route.plan;
    let builderKey = route.template;

    if (route.kind !== 'template') {
      plan = await geminiService.generateAnimationPlan(trimmed);
      builderKey = selectBuilderKey(plan);
    }

    if (NODE_ENV === 'development') {
      console.log('[Controller] Route:', route.kind, '| Builder:', builderKey);
    }

    // ── Step 1: Deterministic build ─────────────────────────────────────────
    const rawJSON = applyRequestedDuration(
      buildAnimationFromPlan(plan, trimmed, { template: builderKey }),
      requestedDuration
    );

    // ── Step 2: Final JSON validation ───────────────────────────────────────
    const validation = validateAnimationJSON(rawJSON);
    if (!validation.valid) {
      if (NODE_ENV === 'development') console.error('[Controller] Validation failed:', validation.errors);
      return res.status(422).json({
        error:   'Generated animation JSON is invalid',
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
