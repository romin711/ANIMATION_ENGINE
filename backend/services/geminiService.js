'use strict';

const {
  PLAN_VERSION,
  PLAN_SCENE_TYPES,
  PLAN_SUBJECT_TYPES,
  PLAN_MOTION_TYPES,
  PLAN_COMPLEXITY_LEVELS,
  PLAN_MOOD_TYPES
} = require('../schema/animationPlanSchema');
const { validateAnimationPlan } = require('../validators/animationPlanValidator');
const { createIntentPlan } = require('../processors/PromptClassifier');
const { logGeminiCall, logFailure, logTimeout } = require('../utils/metrics');

const SYSTEM_PROMPT = `
You are an animation intent planner for a deterministic 2D animation builder.
Return ONLY a tiny JSON plan object. No markdown. No comments. No explanation.

Required schema:
{
  "version": "1.0",
  "sceneType": "single-object | orbit | chart | text | abstract | multi-object",
  "subject": {
    "type": "square | circle | planet | candlestick | text | custom",
    "label": "short string",
    "color": "#hex"
  },
  "secondarySubjects": [
    {
      "type": "square | circle | planet | candlestick | text | custom",
      "label": "short string",
      "color": "#hex"
    }
  ],
  "motion": {
    "type": "spin | orbit | fade | bounce | float | pulse | reveal",
    "loop": true
  },
  "style": {
    "complexity": "basic | medium | rich",
    "mood": "clean | playful | dramatic | calm | futuristic"
  }
}

Rules:
- Keep it tiny.
- No coordinates.
- No canvas config.
- No element arrays.
- No timeline arrays.
- No more than 2 secondary subjects.
- Keep labels short and generic.
- If unsure, choose the simplest matching plan.

Examples:
- "red square spinning" => single-object square with spin
- "blue planet orbiting a star" => orbit scene with planet subject and star secondarySubjects
- "show text \\"HELLO\\"" => text scene with subject.label "HELLO"
- "futuristic city with floating neon particles" => multi-object or abstract scene with city subject and particles secondarySubjects
`.trim();

const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
const GEMINI_TIMEOUT_MS = readIntEnv('GEMINI_TIMEOUT_MS', 60000);
const GEMINI_MAX_RETRIES = readIntEnv('GEMINI_MAX_RETRIES', 2);
const GEMINI_PLAN_MAX_OUTPUT_TOKENS = readIntEnv('GEMINI_PLAN_MAX_OUTPUT_TOKENS', 256);
const GEMINI_PLAN_TEMPERATURE = readFloatEnv('GEMINI_PLAN_TEMPERATURE', 0.1);
const GEMINI_TOP_P = readFloatEnv('GEMINI_TOP_P', 0.7);
const GEMINI_MAX_CONCURRENCY = readIntEnv('GEMINI_MAX_CONCURRENCY', 1);
const GEMINI_MIN_INTERVAL_MS = readIntEnv('GEMINI_MIN_INTERVAL_MS', 1500);
const GEMINI_CACHE_TTL_MS = readIntEnv('GEMINI_CACHE_TTL_MS', 300000);

const geminiResponseCache = new Map();
const geminiInFlightRequests = new Map();
const geminiPendingQueue = [];
let geminiActiveCount = 0;
let geminiLastDispatchAt = 0;
let geminiQueueTimer = null;

function readIntEnv(name, fallback) {
  const raw = process.env[name];
  const value = Number.parseInt(raw, 10);
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

function readFloatEnv(name, fallback) {
  const raw = process.env[name];
  const value = Number.parseFloat(raw);
  return Number.isFinite(value) && value >= 0 ? value : fallback;
}

function sleep(ms) {
  return new Promise(function (resolve) {
    setTimeout(resolve, ms);
  });
}

function cloneJSON(value) {
  return JSON.parse(JSON.stringify(value));
}

function createServiceError(message, statusCode) {
  const err = new Error(message);
  err.statusCode = statusCode;
  return err;
}

function isRetryableStatus(status) {
  return status === 408 || status === 429 || status === 500 || status === 502 || status === 503 || status === 504;
}

function parseRetryAfterMs(response) {
  const retryAfter = response.headers.get('retry-after');
  if (!retryAfter) return null;

  const seconds = Number.parseInt(retryAfter, 10);
  if (Number.isFinite(seconds) && seconds >= 0) return seconds * 1000;

  const dateMs = Date.parse(retryAfter);
  if (!Number.isNaN(dateMs)) {
    return Math.max(0, dateMs - Date.now());
  }

  return null;
}

function getCacheEntry(cacheKey) {
  const entry = geminiResponseCache.get(cacheKey);
  if (!entry) return null;

  if (entry.expiresAt <= Date.now()) {
    geminiResponseCache.delete(cacheKey);
    return null;
  }

  return entry.value;
}

function setCacheEntry(cacheKey, value) {
  geminiResponseCache.set(cacheKey, {
    value: cloneJSON(value),
    expiresAt: Date.now() + GEMINI_CACHE_TTL_MS
  });
}

function processGeminiQueue() {
  if (geminiActiveCount >= GEMINI_MAX_CONCURRENCY) return;
  if (geminiPendingQueue.length === 0) return;

  const waitMs = Math.max(0, GEMINI_MIN_INTERVAL_MS - (Date.now() - geminiLastDispatchAt));
  if (waitMs > 0) {
    if (!geminiQueueTimer) {
      geminiQueueTimer = setTimeout(function () {
        geminiQueueTimer = null;
        processGeminiQueue();
      }, waitMs);
    }
    return;
  }

  const nextTask = geminiPendingQueue.shift();
  geminiActiveCount++;
  geminiLastDispatchAt = Date.now();

  Promise.resolve()
    .then(nextTask.task)
    .then(nextTask.resolve, nextTask.reject)
    .finally(function () {
      geminiActiveCount = Math.max(0, geminiActiveCount - 1);
      processGeminiQueue();
    });

  if (geminiActiveCount < GEMINI_MAX_CONCURRENCY) {
    processGeminiQueue();
  }
}

function scheduleGeminiRequest(task) {
  return new Promise(function (resolve, reject) {
    geminiPendingQueue.push({ task, resolve, reject });
    processGeminiQueue();
  });
}

function buildPromptText(description) {
  return [
    'User prompt:',
    description,
    '',
    'Heuristic hint from backend:',
    JSON.stringify(createIntentPlan(description)),
    '',
    'Use the user prompt as the source of truth. You may refine the heuristic hint if it is incomplete.',
    'Return only the minimal animation plan JSON.'
  ].join('\n');
}

function buildPayload(description) {
  return {
    systemInstruction: {
      parts: [{ text: SYSTEM_PROMPT }]
    },
    contents: [{
      role: 'user',
      parts: [{ text: buildPromptText(description) }]
    }],
    generationConfig: {
      temperature: GEMINI_PLAN_TEMPERATURE,
      topP: GEMINI_TOP_P,
      maxOutputTokens: GEMINI_PLAN_MAX_OUTPUT_TOKENS,
      responseMimeType: 'application/json'
    }
  };
}

function getCandidateText(data) {
  const parts = data?.candidates?.[0]?.content?.parts || [];
  return parts
    .map(function (part) {
      return typeof part.text === 'string' ? part.text : '';
    })
    .join('')
    .trim();
}

function stripFences(raw) {
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
  return fenced ? fenced[1].trim() : raw.trim();
}

function extractBalancedJSONObject(raw) {
  let start = -1;
  let depth = 0;
  let inString = false;
  let escaped = false;

  for (let index = 0; index < raw.length; index++) {
    const char = raw[index];

    if (start === -1) {
      if (char === '{') {
        start = index;
        depth = 1;
      }
      continue;
    }

    if (inString) {
      if (escaped) {
        escaped = false;
      } else if (char === '\\') {
        escaped = true;
      } else if (char === '"') {
        inString = false;
      }
      continue;
    }

    if (char === '"') {
      inString = true;
      continue;
    }

    if (char === '{') depth++;
    if (char === '}') depth--;

    if (depth === 0) {
      return raw.slice(start, index + 1);
    }
  }

  return null;
}

function parseJSONObject(data) {
  const finishReason = data?.candidates?.[0]?.finishReason || 'unknown';
  const rawText = getCandidateText(data);

  if (!rawText) {
    const err = createServiceError('Gemini returned no planning content. Finish reason: ' + finishReason, 502);
    err.retryable = finishReason === 'MAX_TOKENS' || finishReason === 'RECITATION';
    err.fallbackReason = 'jsonParse';
    throw err;
  }

  const cleaned = stripFences(rawText);
  const extracted = extractBalancedJSONObject(cleaned) || cleaned;

  try {
    return JSON.parse(extracted);
  } catch (_) {
    const err = createServiceError('Gemini returned malformed plan JSON. Finish reason: ' + finishReason + '.', 502);
    err.retryable = finishReason === 'MAX_TOKENS';
    err.fallbackReason = 'jsonParse';
    throw err;
  }
}

function sanitizeEnum(value, allowed, fallback) {
  return allowed.includes(value) ? value : fallback;
}

function sanitizeSubject(subject, fallback) {
  const input = subject && typeof subject === 'object' && !Array.isArray(subject) ? subject : {};
  const base = fallback || {
    type: 'custom',
    label: 'Subject',
    color: '#3b82f6'
  };

  return {
    type: sanitizeEnum(input.type, PLAN_SUBJECT_TYPES, base.type),
    label: typeof input.label === 'string' && input.label.trim() ? input.label.trim().slice(0, 40) : base.label,
    color: typeof input.color === 'string' && /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(input.color)
      ? input.color.toLowerCase()
      : base.color
  };
}

function sanitizePlan(rawPlan, description) {
  const fallback = createIntentPlan(description);
  const input = rawPlan && typeof rawPlan === 'object' && !Array.isArray(rawPlan) ? rawPlan : {};

  return {
    version: PLAN_VERSION,
    sceneType: sanitizeEnum(input.sceneType, PLAN_SCENE_TYPES, fallback.sceneType),
    subject: sanitizeSubject(input.subject, fallback.subject),
    secondarySubjects: Array.isArray(input.secondarySubjects)
      ? input.secondarySubjects.slice(0, 2).map(function (subject, index) {
          return sanitizeSubject(subject, fallback.secondarySubjects[index] || fallback.subject);
        })
      : fallback.secondarySubjects,
    motion: {
      type: sanitizeEnum(input.motion && input.motion.type, PLAN_MOTION_TYPES, fallback.motion.type),
      loop: typeof (input.motion && input.motion.loop) === 'boolean' ? input.motion.loop : fallback.motion.loop
    },
    style: {
      complexity: sanitizeEnum(input.style && input.style.complexity, PLAN_COMPLEXITY_LEVELS, fallback.style.complexity),
      mood: sanitizeEnum(input.style && input.style.mood, PLAN_MOOD_TYPES, fallback.style.mood)
    }
  };
}

async function callGeminiAPI(url, payload, attemptNumber) {
  return scheduleGeminiRequest(async function () {
    const controller = new AbortController();
    const timeoutId = setTimeout(function () {
      controller.abort();
    }, GEMINI_TIMEOUT_MS);

    try {
      logGeminiCall();
      const response = await fetch(url, {
        method: 'POST',
        signal: controller.signal,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errText = await response.text();
        const statusCode = response.status === 429
          ? 429
          : (isRetryableStatus(response.status) ? 502 : 500);
        const err = createServiceError(
          'Gemini planning request failed with status ' + response.status + ' on attempt ' + attemptNumber + '.',
          statusCode
        );
        err.retryable = isRetryableStatus(response.status);
        err.providerStatus = response.status;
        err.providerBody = errText;
        err.retryAfterMs = response.status === 429 ? parseRetryAfterMs(response) : null;
        throw err;
      }

      return response.json();
    } catch (err) {
      if (err.name === 'AbortError') {
        logTimeout();
        const timeoutErr = createServiceError(
          'Gemini planning request timed out after ' + Math.round(GEMINI_TIMEOUT_MS / 1000) + ' seconds.',
          504
        );
        timeoutErr.retryable = true;
        timeoutErr.fallbackReason = 'timeout';
        throw timeoutErr;
      }

      throw err;
    } finally {
      clearTimeout(timeoutId);
    }
  });
}

function buildFallbackPlan(description) {
  return createIntentPlan(description);
}

async function generateAnimationPlan(description) {
  const normalizedDescription = String(description || '').trim();
  const cacheKey = 'plan:' + normalizedDescription.toLowerCase();
  const cachedValue = getCacheEntry(cacheKey);
  if (cachedValue) return cloneJSON(cachedValue);

  const fallbackPlan = buildFallbackPlan(normalizedDescription);
  const validation = validateAnimationPlan(fallbackPlan);
  if (!validation.valid) {
    throw createServiceError('Local fallback plan failed validation: ' + validation.errors.join(' | '), 500);
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    const fallbackWithMeta = Object.assign({}, fallbackPlan, {
      _geminiAttempted: false,
      _fallbackUsed: true,
      _fallbackReason: 'no_api_key'
    });
    setCacheEntry(cacheKey, fallbackWithMeta);
    return cloneJSON(fallbackWithMeta);
  }

  const inFlight = geminiInFlightRequests.get(cacheKey);
  if (inFlight) return cloneJSON(await inFlight);

  const url = 'https://generativelanguage.googleapis.com/v1beta/models/' + GEMINI_MODEL + ':generateContent?key=' + apiKey;
  const requestPromise = (async function () {
    let lastError = null;

    for (let attempt = 1; attempt <= GEMINI_MAX_RETRIES + 1; attempt++) {
      try {
        const data = await callGeminiAPI(url, buildPayload(normalizedDescription), attempt);
        const plan = Object.assign(
          sanitizePlan(parseJSONObject(data), normalizedDescription),
          { _geminiAttempted: true, _fallbackUsed: false }
        );
        const planValidation = validateAnimationPlan(plan);

        if (!planValidation.valid) {
          throw createServiceError('Gemini returned an invalid animation plan.', 502);
        }

        setCacheEntry(cacheKey, plan);
        return plan;
      } catch (err) {
        lastError = err;
        if (attempt <= GEMINI_MAX_RETRIES && err.retryable) {
          const retryDelay = err.retryAfterMs != null
            ? Math.max(err.retryAfterMs, GEMINI_MIN_INTERVAL_MS)
            : Math.min(8000, 1200 * Math.pow(2, attempt - 1));
          await sleep(retryDelay);
          continue;
        }

        break;
      }
    }

    const fallbackReason = lastError?.fallbackReason || (lastError?.message && lastError.message.includes('malformed plan JSON') ? 'jsonParse' : 'gemini_failure');
    if (fallbackReason === 'jsonParse') {
      logFailure('jsonParse');
    }
    const fallbackWithMeta = Object.assign({}, fallbackPlan, {
      _geminiAttempted: true,
      _fallbackUsed: true,
      _fallbackReason: fallbackReason
    });
    setCacheEntry(cacheKey, fallbackWithMeta);
    return fallbackWithMeta;
  })();

  geminiInFlightRequests.set(cacheKey, requestPromise);

  try {
    return cloneJSON(await requestPromise);
  } finally {
    geminiInFlightRequests.delete(cacheKey);
  }
}

module.exports = {
  buildFallbackPlan,
  generateAnimationPlan
};
