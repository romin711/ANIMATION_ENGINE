'use strict';

// ─────────────────────────────────────────────────────────────────────────────
// SYSTEM PROMPT
// ─────────────────────────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `
You are a professional 2D motion graphics artist and animation scripter.
Your job is to convert a text description into a basic, clean 2D animation JSON.

You MUST return ONLY a valid raw JSON object.
No markdown, no backticks, no explanation. First character { last character }.
Return minified JSON on a single line. Do not pretty-print.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SCHEMA CONTRACT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

{
  "version": "1.0",
  "canvas": { "width": 800, "height": 450, "background": "<hex>" },
  "elements": [ <element>, ... ],
  "timeline": [ <animation>, ... ]
}

ELEMENT:
{
  "id": "<unique string>",
  "type": "circle | rect | text",
  "x": <number>,  "y": <number>,
  "radius": <number — circle only>,
  "width": <number — rect only>,  "height": <number — rect only>,
  "rx": <0–100, optional — rounded corners on rect>,
  "content": "<string — text only>",
  "fontSize": <number — text only>,
  "fontWeight": "normal | bold",
  "fill": "<hex>",
  "stroke": "<hex, optional>",
  "strokeWidth": <number, optional>,
  "opacity": <0–1>,
  "blur": <0–20, optional>
}

ANIMATION:
{
  "id": "<unique string>",
  "target": "<element id>",
  "type": "move | fade | scale | rotate | color | blur",
  "from": { <prop: value> },
  "to":   { <prop: value> },
  "duration": <seconds, positive>,
  "delay": <seconds, 0+>,
  "ease": "<GSAP ease string>",
  "repeat": <-1 | 0 | N>,
  "yoyo": <true | false>
}

EASE OPTIONS:
"none", "power1.out", "power2.out", "power2.inOut", "power3.out",
"power4.out", "back.out(1.7)", "back.in(1.7)", "elastic.out(1, 0.3)",
"bounce.out", "circ.out", "expo.out", "sine.inOut", "sine.out"

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PHYSICS NAMING — CRITICAL
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

The backend applies real physics simulations to elements based on their ID names.
USE THESE KEYWORDS IN ELEMENT IDs TO TRIGGER THE RIGHT SIMULATION:

  orbit / revolv / satellite / circling → circular orbit path (real math)
  ellips / comet / oval             → elliptical orbit (Kepler-style)
  bounce / fall / drop / gravity    → gravity + elastic bounce
  spring / elastic / wobbl          → spring physics (Hooke's Law)
  pendulum / swing / sway           → pendulum equation
  spiral / vortex / swirl           → expanding spiral path
  wave / ripple / oscillat          → sine wave travel path
  float / drift / hover / bubble    → organic noise-based float
  lissajous / knot / weave          → Lissajous curve (frequency ratios)
  figure8 / infinity / loop-8       → figure-8 lemniscate path
  spark / burst / particle / confetti → particle burst system
  projectile / launch / cannon      → parabolic arc with drag

Use explicit orbit keywords in the id. Do NOT rely on generic names like
"star", "dot", "orb", or "ball" to trigger orbit physics.

EXAMPLE: An orbiting moon should have id "moon-orbit" or "orbit-satellite-1".
EXAMPLE: A bouncing ball should have id "ball-bounce" or "gravity-ball".
EXAMPLE: A floating bubble should have id "bubble-float-1".

The physics engine will automatically compute mathematically accurate
keyframe paths for these — you just need to provide the correct id and
a rough starting position. The from/to values act as hints for start/end.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
FAST OUTPUT RULES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. Prefer very basic scenes by default.
2. Simple prompts: 1–2 elements total.
3. Medium prompts: 2–4 elements total.
4. Only use more than 4 elements if the user explicitly asks for a detailed scene.
5. Avoid background decoration unless it is essential.
6. Every element should usually have exactly 1 timeline entry.
7. Keep JSON compact. No duplicate layers. No extra effects.
8. If one object is enough, return one object.
9. Use repeat:-1 only for clearly continuous motion like spin or orbit.
10. Colors: pick a cohesive 2–3 color palette.
11. Avoid blur unless the prompt clearly needs glow.
12. Keep the result simple but satisfying.
13. Return only the necessary animation data for a satisfying result.
14. For a single object prompt, use a single main subject only.
15. Keep total timeline entries minimal while preserving the main motion.

RETURN ONLY RAW JSON.
`.trim();

// ─────────────────────────────────────────────────────────────────────────────

const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
const GEMINI_TIMEOUT_MS = readIntEnv('GEMINI_TIMEOUT_MS', 60000);
const GEMINI_MAX_RETRIES = readIntEnv('GEMINI_MAX_RETRIES', 2);
const GEMINI_MAX_OUTPUT_TOKENS = readIntEnv('GEMINI_MAX_OUTPUT_TOKENS', 1536);
const GEMINI_COMPACT_MAX_OUTPUT_TOKENS = readIntEnv('GEMINI_COMPACT_MAX_OUTPUT_TOKENS', 768);
const GEMINI_MICRO_MAX_OUTPUT_TOKENS = readIntEnv('GEMINI_MICRO_MAX_OUTPUT_TOKENS', 512);
const GEMINI_TEMPERATURE = readFloatEnv('GEMINI_TEMPERATURE', 0.2);
const GEMINI_TOP_P = readFloatEnv('GEMINI_TOP_P', 0.8);
const GEMINI_COMPACT_TEMPERATURE = readFloatEnv('GEMINI_COMPACT_TEMPERATURE', 0.1);
const GEMINI_MICRO_TEMPERATURE = readFloatEnv('GEMINI_MICRO_TEMPERATURE', 0.05);
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
  return new Promise(resolve => setTimeout(resolve, ms));
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

function buildPromptText(description, mode) {
  if (mode === 'normal') {
    return description + '\n\nESSENTIAL OUTPUT MODE:\n'
      + '- Return only the minimum necessary animation data.\n'
      + '- Do not add extra decorative layers unless clearly needed.\n'
      + '- Use 1 or 2 elements when possible.\n'
      + '- Use 1 timeline entry per element when possible.\n'
      + '- Return minified one-line JSON only.';
  }

  if (mode === 'compact') {
    return description + '\n\nCOMPACT MODE:\n'
      + '- Return a smaller valid scene.\n'
      + '- Use 1 to 3 elements maximum.\n'
      + '- Use 1 timeline entry per element when possible.\n'
      + '- Use no background layer unless essential.\n'
      + '- Use no decorative accent layer unless essential.\n'
      + '- Prefer concise ids and avoid decorative extras unless essential.\n'
      + '- If the scene would be too large, simplify it rather than returning partial JSON.\n'
      + '- Return minified one-line JSON only.\n'
      + '- Return only one complete JSON object.';
  }

  return description + '\n\nMICRO MODE:\n'
    + '- Return the simplest valid animation that matches the request.\n'
    + '- Use 1 to 2 elements maximum.\n'
    + '- Use only the most important motion.\n'
    + '- Avoid optional props unless essential.\n'
    + '- No decorative extras, no duplicate layers, no unnecessary repeats.\n'
    + '- Return minified one-line JSON only.\n'
    + '- If needed, simplify the scene aggressively rather than returning partial JSON.';
}

function estimatePromptComplexity(description) {
  const lower = description.toLowerCase();
  const wordCount = description.trim().split(/\s+/).filter(Boolean).length;
  const complexSignals = [
    'cinematic', 'complex', 'multi', 'multiple', 'scene', 'landscape', 'galaxy',
    'city', 'crowd', 'particles', 'particle', 'many', 'several', 'detailed'
  ];
  const simpleSignals = [
    'single', 'one', 'simple', 'square', 'circle', 'rect', 'rectangle',
    'candlestick', 'candle stick', 'logo', 'icon', 'planet', 'star', 'ball'
  ];

  let score = 0;
  score += Math.max(0, wordCount - 12);
  score += (description.match(/,/g) || []).length * 2;
  score += (description.match(/\band\b/gi) || []).length;

  if (complexSignals.some(signal => lower.includes(signal))) score += 4;
  if (simpleSignals.some(signal => lower.includes(signal))) score -= 2;

  if (score <= 1) return 'simple';
  if (score <= 5) return 'medium';
  return 'complex';
}

function getModeOrder(description) {
  const complexity = estimatePromptComplexity(description);

  if (complexity === 'simple') return ['micro', 'compact', 'normal'];
  if (complexity === 'medium') return ['compact', 'micro', 'normal'];
  return ['normal', 'compact', 'micro'];
}

function getModeGenerationConfig(mode) {
  if (mode === 'micro') {
    return {
      temperature: GEMINI_MICRO_TEMPERATURE,
      maxOutputTokens: GEMINI_MICRO_MAX_OUTPUT_TOKENS
    };
  }

  if (mode === 'compact') {
    return {
      temperature: GEMINI_COMPACT_TEMPERATURE,
      maxOutputTokens: GEMINI_COMPACT_MAX_OUTPUT_TOKENS
    };
  }

  return {
    temperature: GEMINI_TEMPERATURE,
    maxOutputTokens: GEMINI_MAX_OUTPUT_TOKENS
  };
}

function buildPayload(description, mode) {
  const config = getModeGenerationConfig(mode);

  return {
    systemInstruction: {
      parts: [{ text: SYSTEM_PROMPT }]
    },
    contents: [{
      role:  'user',
      parts: [{ text: buildPromptText(description, mode) }]
    }],
    generationConfig: {
      temperature:      config.temperature,
      topP:             GEMINI_TOP_P,
      maxOutputTokens:  config.maxOutputTokens,
      responseMimeType: 'application/json'
    }
  };
}

function getCandidateText(data) {
  const parts = data?.candidates?.[0]?.content?.parts || [];
  return parts
    .map(part => typeof part.text === 'string' ? part.text : '')
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

  for (let i = 0; i < raw.length; i++) {
    const ch = raw[i];

    if (start === -1) {
      if (ch === '{') {
        start = i;
        depth = 1;
      }
      continue;
    }

    if (inString) {
      if (escaped) {
        escaped = false;
      } else if (ch === '\\') {
        escaped = true;
      } else if (ch === '"') {
        inString = false;
      }
      continue;
    }

    if (ch === '"') {
      inString = true;
      continue;
    }

    if (ch === '{') depth++;
    if (ch === '}') depth--;

    if (depth === 0) {
      return raw.slice(start, i + 1);
    }
  }

  return null;
}

function isLikelyTruncatedJSON(raw, finishReason) {
  if (finishReason === 'MAX_TOKENS') return true;
  if (!raw) return false;

  const trimmed = raw.trim();
  return trimmed.startsWith('{') && !trimmed.endsWith('}');
}

function parseAnimationJSON(data) {
  const finishReason = data?.candidates?.[0]?.finishReason || 'unknown';
  const rawText = getCandidateText(data);

  if (!rawText) {
    const err = createServiceError('Gemini returned no content. Finish reason: ' + finishReason, 502);
    err.retryable = finishReason === 'MAX_TOKENS' || finishReason === 'RECITATION';
    throw err;
  }

  const cleaned = stripFences(rawText);
  const extracted = extractBalancedJSONObject(cleaned) || cleaned;

  try {
    return JSON.parse(extracted);
  } catch (_) {
    const err = createServiceError(
      'Gemini returned malformed JSON. Finish reason: ' + finishReason + '.',
      502
    );
    err.retryable = isLikelyTruncatedJSON(cleaned, finishReason);
    err.rawPreview = cleaned.slice(0, 300);
    throw err;
  }
}

function detectHexColor(description) {
  const lower = description.toLowerCase();
  const colors = [
    ['red', '#ef4444'],
    ['blue', '#3b82f6'],
    ['green', '#22c55e'],
    ['yellow', '#facc15'],
    ['orange', '#f97316'],
    ['purple', '#a855f7'],
    ['pink', '#ec4899'],
    ['white', '#f8fafc'],
    ['black', '#111827'],
    ['gold', '#f59e0b']
  ];

  for (const [name, hex] of colors) {
    if (lower.includes(name)) return hex;
  }

  return '#3b82f6';
}

function buildSquareFallback(description) {
  const fill = detectHexColor(description);
  const lower = description.toLowerCase();
  const rotation = lower.includes('spin') || lower.includes('rotate');

  return {
    version: '1.0',
    canvas: { width: 800, height: 450, background: '#0f172a' },
    elements: [
      { id: 'square-main', type: 'rect', x: 360, y: 185, width: 80, height: 80, fill, opacity: 1, rx: 10 }
    ],
    timeline: [
      rotation
        ? { id: 'square-spin', target: 'square-main', type: 'rotate', from: { rotation: 0 }, to: { rotation: 360 }, duration: 2.5, delay: 0, ease: 'none', repeat: -1, yoyo: false }
        : { id: 'square-fade', target: 'square-main', type: 'fade', from: { opacity: 0 }, to: { opacity: 1 }, duration: 1.2, delay: 0, ease: 'power2.out', repeat: 0, yoyo: false }
    ]
  };
}

function buildCandlestickFallback() {
  return {
    version: '1.0',
    canvas: { width: 800, height: 450, background: '#0b1220' },
    elements: [
      { id: 'candle-up', type: 'rect', x: 220, y: 165, width: 36, height: 90, fill: '#22c55e', opacity: 1, rx: 4 },
      { id: 'candle-down', type: 'rect', x: 400, y: 145, width: 36, height: 110, fill: '#ef4444', opacity: 1, rx: 4 },
      { id: 'candle-up-2', type: 'rect', x: 580, y: 180, width: 36, height: 75, fill: '#22c55e', opacity: 1, rx: 4 }
    ],
    timeline: [
      { id: 'candles-rise', target: 'candle-up', type: 'fade', from: { opacity: 0 }, to: { opacity: 1 }, duration: 0.7, delay: 0, ease: 'power2.out', repeat: 0, yoyo: false },
      { id: 'candles-rise-2', target: 'candle-down', type: 'fade', from: { opacity: 0 }, to: { opacity: 1 }, duration: 0.7, delay: 0.1, ease: 'power2.out', repeat: 0, yoyo: false },
      { id: 'candles-rise-3', target: 'candle-up-2', type: 'fade', from: { opacity: 0 }, to: { opacity: 1 }, duration: 0.7, delay: 0.2, ease: 'power2.out', repeat: 0, yoyo: false }
    ]
  };
}

function buildOrbitFallback(description) {
  const fill = detectHexColor(description);

  return {
    version: '1.0',
    canvas: { width: 800, height: 450, background: '#08111f' },
    elements: [
      { id: 'star-core', type: 'circle', x: 400, y: 225, radius: 36, fill: '#facc15', opacity: 1, blur: 0 },
      { id: 'planet-orbit', type: 'circle', x: 560, y: 225, radius: 20, fill, opacity: 1 }
    ],
    timeline: [
      { id: 'planet-loop', target: 'planet-orbit', type: 'move', from: { x: 560, y: 225 }, to: { x: 560, y: 225 }, duration: 4, delay: 0, ease: 'none', repeat: -1, yoyo: false }
    ]
  };
}

function buildSimpleFallback(description) {
  const lower = description.toLowerCase();

  if (lower.includes('candlestick') || lower.includes('candle stick')) {
    return buildCandlestickFallback();
  }

  if (lower.includes('orbit') || lower.includes('satellite') || lower.includes('planet')) {
    return buildOrbitFallback(description);
  }

  if (lower.includes('square') || lower.includes('rect') || lower.includes('rectangle')) {
    return buildSquareFallback(description);
  }

  return null;
}

function prioritizeElementIds(animationJSON) {
  const priorityIds = [];
  const seen = new Set();

  (animationJSON.timeline || []).forEach(anim => {
    if (anim.target && !seen.has(anim.target)) {
      seen.add(anim.target);
      priorityIds.push(anim.target);
    }
  });

  (animationJSON.elements || []).forEach(el => {
    if (el.id && !seen.has(el.id)) {
      seen.add(el.id);
      priorityIds.push(el.id);
    }
  });

  return priorityIds;
}

function getPruneLimits(description) {
  const complexity = estimatePromptComplexity(description);

  if (complexity === 'simple') return { maxElements: 2, maxTimeline: 2 };
  if (complexity === 'medium') return { maxElements: 4, maxTimeline: 5 };
  return { maxElements: 6, maxTimeline: 8 };
}

function pruneAnimationJSON(animationJSON, description) {
  const limits = getPruneLimits(description);
  const selectedIds = new Set(prioritizeElementIds(animationJSON).slice(0, limits.maxElements));

  const elements = (animationJSON.elements || []).filter(el => selectedIds.has(el.id));
  const timeline = (animationJSON.timeline || [])
    .filter(anim => selectedIds.has(anim.target))
    .slice(0, limits.maxTimeline);

  const referencedIds = new Set(timeline.map(anim => anim.target));
  const finalElements = elements.filter(el => referencedIds.has(el.id) || elements.length <= limits.maxElements);

  return Object.assign({}, animationJSON, {
    elements: finalElements.slice(0, limits.maxElements),
    timeline
  });
}

async function callGeminiAPI(url, payload, attemptNumber) {
  return scheduleGeminiRequest(async function () {
    const controller = new AbortController();
    const timeoutId  = setTimeout(() => controller.abort(), GEMINI_TIMEOUT_MS);

    try {
      const response = await fetch(url, {
        method:  'POST',
        signal:  controller.signal,
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(payload)
      });

      if (!response.ok) {
        const errText = await response.text();
        const message = 'Gemini API Error (' + response.status + ') on attempt ' + attemptNumber + '.';
        const statusCode = response.status === 429
          ? 429
          : (isRetryableStatus(response.status) ? 502 : 500);
        const err = createServiceError(message, statusCode);
        err.retryable = isRetryableStatus(response.status);
        err.providerStatus = response.status;
        err.providerBody = errText;
        err.retryAfterMs = response.status === 429 ? parseRetryAfterMs(response) : null;
        throw err;
      }

      return response.json();
    } catch (err) {
      if (err.name === 'AbortError') {
        const timeoutErr = createServiceError(
          'Gemini API timed out after ' + Math.round(GEMINI_TIMEOUT_MS / 1000) + ' seconds.',
          504
        );
        timeoutErr.retryable = true;
        throw timeoutErr;
      }

      throw err;
    } finally {
      clearTimeout(timeoutId);
    }
  });
}

async function generateAnimationJSON(description) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('GEMINI_API_KEY environment variable is missing.');

  const url =
    'https://generativelanguage.googleapis.com/v1beta/models/' + GEMINI_MODEL + ':generateContent?key=' + apiKey;
  const cacheKey = description.trim();
  const cachedValue = getCacheEntry(cacheKey);
  if (cachedValue) return cloneJSON(cachedValue);

  const inFlight = geminiInFlightRequests.get(cacheKey);
  if (inFlight) return cloneJSON(await inFlight);

  const requestPromise = (async function () {
    let lastErr = null;
    const modeOrder = getModeOrder(description);

    for (const mode of modeOrder) {
      for (let attempt = 1; attempt <= GEMINI_MAX_RETRIES + 1; attempt++) {
        try {
          const data = await callGeminiAPI(url, buildPayload(description, mode), attempt);
          const parsed = pruneAnimationJSON(parseAnimationJSON(data), description);
          setCacheEntry(cacheKey, parsed);
          return parsed;
        } catch (err) {
          lastErr = err;

          if (attempt <= GEMINI_MAX_RETRIES && err.retryable) {
            const retryDelay = err.retryAfterMs != null
              ? Math.max(err.retryAfterMs, GEMINI_MIN_INTERVAL_MS)
              : Math.min(8000, 1200 * Math.pow(2, attempt - 1));
            await sleep(retryDelay);
            continue;
          }

          if (mode !== 'micro' && err.retryable) {
            break;
          }

          if (err.providerStatus === 429) {
            const rateLimitErr = createServiceError(
              'Gemini rate limit reached. Please retry in a few seconds.',
              429
            );
            rateLimitErr.retryAfterMs = err.retryAfterMs;
            throw rateLimitErr;
          }

          if (err.providerStatus) {
            throw createServiceError(
              'Gemini request failed after ' + attempt + ' attempt(s). Provider status: ' + err.providerStatus + '.',
              err.statusCode || 502
            );
          }

          if (mode === 'micro' && err.rawPreview) {
            throw createServiceError(
              err.message + ' Preview: ' + err.rawPreview,
              err.statusCode || 502
            );
          }

          if (!err.retryable) throw err;
        }
      }
    }

    const fallback = buildSimpleFallback(description);
    if (fallback) {
      setCacheEntry(cacheKey, fallback);
      return fallback;
    }

    throw lastErr || createServiceError('Gemini request failed before producing JSON.', 502);
  })();

  geminiInFlightRequests.set(cacheKey, requestPromise);

  try {
    return cloneJSON(await requestPromise);
  } finally {
    geminiInFlightRequests.delete(cacheKey);
  }
}

module.exports = { generateAnimationJSON };
