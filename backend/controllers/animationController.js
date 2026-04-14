'use strict';

const geminiService = require('../services/geminiService');
const { buildAnimationFromPlan } = require('../builders/buildAnimationFromPlan');
const { enrichAnimation } = require('../processors/AnimationEnricher');
const { classifyPrompt, createIntentPlan, normalizePrompt } = require('../processors/PromptClassifier');
const { validateAnimationPlan } = require('../validators/animationPlanValidator');
const { validateAnimationJSON } = require('../validators/animationValidator');
const { metrics, startTimer, endTimer, logFallback, logFailure } = require('../utils/metrics');

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

function createDirectPlan(description, type) {
  return Object.assign({}, createIntentPlan(description, {
    type,
    prompt: description
  }), {
    type,
    prompt: description
  });
}

function attachPlanMetadata(plan, description, type) {
  return Object.assign({}, plan, {
    type: plan?.type || type || 'unknown',
    prompt: description
  });
}

function logMetricsSnapshot() {
  console.log('METRICS_SNAPSHOT:', JSON.stringify(metrics));
}

async function fetchComplexPlan(description, classification) {
  const plan = attachPlanMetadata(
    await geminiService.generateAnimationPlan(description),
    description,
    classification.type
  );

  return {
    plan,
    geminiBacked: Boolean(plan?._geminiAttempted && !plan?._fallbackUsed),
    fallbackUsed: Boolean(plan?._fallbackUsed)
  };
}

function activateUnknownFallback(description, state) {
  if (!state.fallbackUsed) {
    console.warn('FALLBACK_USED', description);
    logFallback();
    state.fallbackUsed = true;
  }

  return createDirectPlan(description, 'unknown');
}

async function generateAnimation(req, res, next) {
  const startTime = startTimer();

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

    const classification = classifyPrompt(trimmed);
    const isSimpleRoute = classification.isSimple === true;

    let plan;
    const runtimeState = { fallbackUsed: false };
    let geminiBacked = false;

    if (isSimpleRoute) {
      console.log('SIMPLE_ROUTE_USED');
      plan = createDirectPlan(trimmed, classification.type);
    } else {
      const complexPlan = await fetchComplexPlan(trimmed, classification);
      plan = complexPlan.plan;
      geminiBacked = complexPlan.geminiBacked;
      if (complexPlan.fallbackUsed) {
        runtimeState.fallbackUsed = true;
        logFallback();
      }
    }

    let planValidation = validateAnimationPlan(plan);
    if (!planValidation.valid) {
      console.error('[Controller] Plan validation failed:', planValidation.errors);
      logFailure('validator');

      if (geminiBacked) {
        const retryResult = await fetchComplexPlan(trimmed, classification);
        const retryPlan = retryResult.plan;

        if (retryResult.fallbackUsed && !runtimeState.fallbackUsed) {
          runtimeState.fallbackUsed = true;
          logFallback();
        }

        const retryValidation = validateAnimationPlan(retryPlan);
        if (retryValidation.valid) {
          plan = retryPlan;
          geminiBacked = retryResult.geminiBacked;
          planValidation = retryValidation;
        } else {
          console.error('[Controller] Plan validation retry failed:', retryValidation.errors);
          logFailure('validator');
          plan = activateUnknownFallback(trimmed, runtimeState);
          geminiBacked = false;
          planValidation = validateAnimationPlan(plan);
        }
      } else {
        plan = activateUnknownFallback(trimmed, runtimeState);
        planValidation = validateAnimationPlan(plan);
      }
    }

    if (!planValidation.valid) {
      console.error('[Controller] Final plan validation failed:', planValidation.errors);
      logFailure('validator');
      return res.status(422).json({
        error: 'Generated animation plan is invalid',
        details: planValidation.errors
      });
    }

    const buildOutput = function (activePlan) {
      return applyRequestedDuration(
        buildAnimationFromPlan(activePlan, trimmed),
        requestedDuration
      );
    };

    let rawJSON = buildOutput(plan);
    let outputValidation = validateAnimationJSON(rawJSON);

    if (!outputValidation.valid) {
      console.error('[Controller] Output validation failed:', outputValidation.errors);
      logFailure('validator');

      if (!runtimeState.fallbackUsed) {
        plan = activateUnknownFallback(trimmed, runtimeState);
        rawJSON = buildOutput(plan);
        outputValidation = validateAnimationJSON(rawJSON);
      }
    }

    if (!outputValidation.valid) {
      console.error('[Controller] Final output validation failed:', outputValidation.errors);
      logFailure('validator');
      return res.status(422).json({
        error: 'Generated animation JSON is invalid',
        details: outputValidation.errors
      });
    }

    let finalJSON = rawJSON;
    try {
      finalJSON = enrichAnimation(rawJSON);
      if (NODE_ENV === 'development') {
        const enriched = (finalJSON.timeline || []).filter(a => a.keyframes).length;
        if (enriched > 0) console.log('[Controller] Physics enriched ' + enriched + ' animation(s).');
      }
    } catch (enrichErr) {
      logFailure('enrichment');
      if (NODE_ENV === 'development') console.error('[Controller] Enrichment error (non-fatal):', enrichErr.message);
    }

    return res.status(200).json({ animation: finalJSON });

  } catch (err) {
    next(err);
  } finally {
    endTimer(startTime);
    logMetricsSnapshot();
  }
}

module.exports = { generateAnimation }; 
