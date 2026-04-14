'use strict';

const { classifyPrompt, createIntentPlan, normalizePrompt } = require('../backend/processors/PromptClassifier');
const geminiService = require('../backend/services/geminiService');
const { buildAnimationFromPlan, selectBuilder } = require('../backend/builders/buildAnimationFromPlan');
const { validateAnimationPlan } = require('../backend/validators/animationPlanValidator');
const { validateAnimationJSON } = require('../backend/validators/animationValidator');
const { enrichAnimation } = require('../backend/processors/AnimationEnricher');

const PROMPTS = [
  'red square spinning',
  'blue circle drifting softly',
  'gold circle pulsing gently',
  'white moon orbiting orange sun',
  'blue planet orbiting a bright yellow star',
  'show text "HELLO"',
  'show glowing cyan text "AETHER"',
  'soft pink bubble floating upward',
  'orange ball bouncing on the floor',
  'silver square bouncing gently',
  'candlestick chart with 4 bars',
  'advanced chart dashboard with rising bars',
  'particle explosion',
  'confetti burst over a dark background',
  'yellow ball with blue particles',
  'pink bubble with green particles',
  'futuristic city with floating cyan particles and glowing text "AETHER"',
  'city skyline with title "NOVA"',
  'skyline with soft amber lights',
  'flowing cyan dots across the screen',
  'ribbon flow field with teal lights',
  'white moon orbiting orange sun with title "ORBIT"',
  'two circles drifting together',
  'blue square and pink circle moving softly',
  'playful title "POP" with bouncing ball',
  'mystery abstract scene',
  'surreal abstract composition',
  'dark dramatic symbol floating in space',
  'calm bubble with caption "BREATHE"',
  'chart with glowing headline "MARKET"',
  'moon orbiting a star over a skyline',
  'skyline with cyan accents and soft title "CITY"',
  'orange bubble with tiny sparks',
  'bold red title "LAUNCH"',
  'neon text "SIGNAL" revealing from below',
  'minimal white circle floating',
  'blue sphere bouncing lightly',
  'stock graph with dramatic bars',
  'spark shower',
  'confetti cloud',
  'two glowing planets with a title "DUO"',
  'futuristic urban skyline',
  'urban skyline with drifting particles',
  'quiet abstract form',
  'planet orbiting star with blue dust',
  'text "ALPHA" over skyline',
  'floating lane lights',
  'green circle spinning',
  'playful bubble and particles',
  'unknown impossible dreamscape'
];

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

async function buildPlan(description, classification) {
  if (classification.isSimple) {
    return {
      plan: createDirectPlan(description, classification.type),
      geminiUsed: false,
      fallbackUsed: false
    };
  }

  const planned = attachPlanMetadata(
    await geminiService.generateAnimationPlan(description),
    description,
    classification.type
  );

  return {
    plan: planned,
    geminiUsed: Boolean(planned?._geminiAttempted && !planned?._fallbackUsed),
    fallbackUsed: Boolean(planned?._fallbackUsed)
  };
}

async function evaluatePrompt(description) {
  const prompt = normalizePrompt(description);
  const startedAt = Date.now();
  const classification = classifyPrompt(prompt);
  let validatorFailures = 0;
  let fallbackUsed = false;
  let builderName = 'unknown';

  const builtPlan = await buildPlan(prompt, classification);
  let plan = builtPlan.plan;
  let geminiUsed = builtPlan.geminiUsed;
  fallbackUsed = builtPlan.fallbackUsed;

  let planValidation = validateAnimationPlan(plan);
  if (!planValidation.valid) {
    validatorFailures += 1;
    if (geminiUsed) {
      const retry = await buildPlan(prompt, classification);
      plan = retry.plan;
      geminiUsed = retry.geminiUsed;
      fallbackUsed = fallbackUsed || retry.fallbackUsed;
      planValidation = validateAnimationPlan(plan);
    }

    if (!planValidation.valid) {
      validatorFailures += 1;
      fallbackUsed = true;
      plan = createDirectPlan(prompt, 'unknown');
      planValidation = validateAnimationPlan(plan);
    }
  }

  if (!planValidation.valid) {
    throw new Error('Plan validation failed for prompt: ' + prompt + ' :: ' + planValidation.errors.join(' | '));
  }

  builderName = selectBuilder(plan).name;
  let animation = buildAnimationFromPlan(plan, prompt);
  let outputValidation = validateAnimationJSON(animation);

  if (!outputValidation.valid) {
    validatorFailures += 1;
    fallbackUsed = true;
    plan = createDirectPlan(prompt, 'unknown');
    builderName = selectBuilder(plan).name;
    animation = buildAnimationFromPlan(plan, prompt);
    outputValidation = validateAnimationJSON(animation);
  }

  if (!outputValidation.valid) {
    validatorFailures += 1;
    throw new Error('Animation validation failed for prompt: ' + prompt + ' :: ' + outputValidation.errors.join(' | '));
  }

  enrichAnimation(animation);

  return {
    prompt,
    classification: classification.type,
    builderName,
    geminiUsed,
    fallbackUsed,
    validatorFailures,
    responseTimeMs: Date.now() - startedAt
  };
}

async function main() {
  const builderUsageCounts = Object.create(null);
  const results = [];

  for (const prompt of PROMPTS) {
    const result = await evaluatePrompt(prompt);
    results.push(result);
    builderUsageCounts[result.builderName] = (builderUsageCounts[result.builderName] || 0) + 1;
  }

  const total = results.length;
  const avgResponseTime = results.reduce(function (sum, item) {
    return sum + item.responseTimeMs;
  }, 0) / total;
  const fallbackCount = results.filter(function (item) { return item.fallbackUsed; }).length;
  const geminiCount = results.filter(function (item) { return item.geminiUsed; }).length;
  const validatorFailures = results.reduce(function (sum, item) {
    return sum + item.validatorFailures;
  }, 0);

  console.log('Evaluation Summary');
  console.log('Prompts:', total);
  console.log('Avg response time (ms):', avgResponseTime.toFixed(2));
  console.log('Fallback %:', ((fallbackCount / total) * 100).toFixed(2));
  console.log('Gemini usage %:', ((geminiCount / total) * 100).toFixed(2));
  console.log('Validator failures:', validatorFailures);
  console.log('Builder usage counts:', JSON.stringify(builderUsageCounts, null, 2));
}

main().catch(function (error) {
  console.error(error && error.stack ? error.stack : error);
  process.exitCode = 1;
});
