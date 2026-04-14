'use strict';

// ─────────────────────────────────────────────────────────────────────────────
// Physics intent tags
// ─────────────────────────────────────────────────────────────────────────────

const INTENT = {
  ORBITAL:    'ORBITAL',
  ELLIPTICAL: 'ELLIPTICAL',
  GRAVITY:    'GRAVITY',
  SPRING:     'SPRING',
  PENDULUM:   'PENDULUM',
  PARTICLE:   'PARTICLE',
  FLOAT:      'FLOAT',
  WAVE:       'WAVE',
  SPIRAL:     'SPIRAL',
  LISSAJOUS:  'LISSAJOUS',
  FIGURE8:    'FIGURE8',
  EPICYCLOID: 'EPICYCLOID',
  DAMPED:     'DAMPED',
  PROJECTILE: 'PROJECTILE',
  STANDARD:   'STANDARD'   // no physics — keep AI's from/to
};

// ─────────────────────────────────────────────────────────────────────────────
// Keyword maps  (order matters — more specific first)
// ─────────────────────────────────────────────────────────────────────────────

const KEYWORD_MAP = [
  { intent: INTENT.PENDULUM,   words: ['pendulum', 'swing', 'sway', 'clock', 'metronom'] },
  { intent: INTENT.PROJECTILE, words: ['projectile', 'launch', 'shoot', 'cannon', 'missile', 'throw'] },
  { intent: INTENT.SPIRAL,     words: ['spiral', 'vortex', 'twirl', 'coil', 'helix', 'swirl'] },
  { intent: INTENT.LISSAJOUS,  words: ['lissajous', 'knot', 'pretzel', 'weave'] },
  { intent: INTENT.FIGURE8,    words: ['figure8', 'figure-8', 'infinity', 'lemniscate', 'loop-8'] },
  { intent: INTENT.EPICYCLOID, words: ['epicycloid', 'rose', 'petal', 'gear', 'spirograph'] },
  { intent: INTENT.ELLIPTICAL, words: ['ellips', 'oval', 'elliptical', 'comet'] },
  { intent: INTENT.ORBITAL,    words: ['orbit', 'revolv', 'satellite', 'circling'] },
  { intent: INTENT.PARTICLE,   words: ['particle', 'spark', 'burst', 'explod', 'confetti', 'debris', 'fleck', 'shard'] },
  { intent: INTENT.FLOAT,      words: ['float', 'drift', 'hover', 'bubble', 'wisp', 'ambient', 'cloud'] },
  { intent: INTENT.WAVE,       words: ['wave', 'ripple', 'oscillat', 'undulat', 'snake', 'ribbon', 'sinusoid'] },
  { intent: INTENT.GRAVITY,    words: ['fall', 'drop', 'gravity', 'bounce', 'rain', 'meteor', 'plummet'] },
  { intent: INTENT.SPRING,     words: ['spring', 'elastic', 'jiggl', 'vibrat', 'wobbl', 'quiver', 'snap'] },
  { intent: INTENT.DAMPED,     words: ['damp', 'decay', 'pluck', 'impact', 'rebound'] }
];

const PROMPT_SUBJECT_GROUPS = [
  /\b(circle|orb|sphere|dot|ball|bubble)\b/g,
  /\b(square|box|cube|rectangle|rect)\b/g,
  /\b(planet|moon|satellite|sun|star)\b/g,
  /\b(text|title|headline|caption|word|label)\b/g,
  /\b(city|skyline|building|buildings|urban|skyscraper|skyscrapers)\b/g,
  /\b(particle|particles|dust|spark|sparks|confetti)\b/g,
  /\b(chart|graph|candlestick|candle stick|candle bar|data)\b/g
];

const PROMPT_MOTION_PATTERNS = [
  { type: 'orbit', pattern: /\b(orbit|orbiting|revolving|circling)\b/ },
  { type: 'bounce', pattern: /\b(bounce|bouncing|jump|jumping|drop|dropping|fall|falling)\b/ },
  { type: 'float', pattern: /\b(float|floating|drift|drifting|hover|hovering)\b/ },
  { type: 'spin', pattern: /\b(spin|spinning|rotate|rotating)\b/ },
  { type: 'flow', pattern: /\b(flow|flowing|stream|streaming|ripple|ribbons?)\b/ },
  { type: 'reveal', pattern: /\b(reveal|revealing|show|showing|appear|appearing)\b/ }
];

function matchIntent(str) {
  const lower = str.toLowerCase();
  for (const { intent, words } of KEYWORD_MAP) {
    if (words.some(w => lower.includes(w))) return intent;
  }
  return null;
}

function summarizePromptComposition(prompt) {
  const normalized = String(prompt || '').trim().replace(/\s+/g, ' ');
  const lower = normalized.toLowerCase();
  const matchedGroups = new Set();

  PROMPT_SUBJECT_GROUPS.forEach(function (pattern, index) {
    if (pattern.test(lower)) {
      matchedGroups.add(index);
    }
    pattern.lastIndex = 0;
  });

  const quotedText = /["“][^"”]{1,60}["”]|'[^']{1,60}'/.test(normalized);
  const conjunctions = (lower.match(/\b(with|and|plus)\b/g) || []).length;
  const subjectCount = Math.max(
    quotedText ? 1 : 0,
    matchedGroups.size + (quotedText && matchedGroups.size > 0 ? 0 : quotedText ? 1 : 0)
  );

  const motion = PROMPT_MOTION_PATTERNS.find(function (entry) {
    return entry.pattern.test(lower);
  });

  return {
    subjectCount,
    motionType: motion ? motion.type : 'float',
    hasTextOverlay: quotedText || /\b(text|title|headline|caption|word|label)\b/.test(lower),
    hasParticles: /\b(particle|particles|dust|spark|sparks|confetti|burst|explosion|explode)\b/.test(lower),
    hasSkyline: /\b(city|skyline|building|buildings|urban|skyscraper|skyscrapers)\b/.test(lower),
    hasCompositeLanguage: conjunctions > 0,
    compositionHints: {
      conjunctions,
      quotedText
    }
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Per-element intent detection
// ─────────────────────────────────────────────────────────────────────────────

function detectElementIntent(element) {
  const str = [element.id, element.type, element.label || ''].join(' ');
  return matchIntent(str) || INTENT.STANDARD;
}

// ─────────────────────────────────────────────────────────────────────────────
// Per-animation intent detection
// Combines animation id, target element id, and structural heuristics.
// ─────────────────────────────────────────────────────────────────────────────

function detectAnimationIntent(anim, elementIntent) {
  // Element-level intent always wins for move animations
  if (anim.type === 'move' && elementIntent !== INTENT.STANDARD) {
    return elementIntent;
  }

  const str = anim.id + ' ' + anim.target;
  const kw  = matchIntent(str);
  if (kw) return kw;

  return INTENT.STANDARD;
}

// ─────────────────────────────────────────────────────────────────────────────
// Main analysis function
// Returns:
//   elementIntents:   Map<elementId, INTENT>
//   animationIntents: Map<animId,    INTENT>
// ─────────────────────────────────────────────────────────────────────────────

function analyzeScene(animationJSON) {
  const elementIntents   = {};
  const animationIntents = {};

  (animationJSON.elements || []).forEach(el => {
    elementIntents[el.id] = detectElementIntent(el);
  });

  (animationJSON.timeline || []).forEach(anim => {
    const elIntent = elementIntents[anim.target] || INTENT.STANDARD;
    animationIntents[anim.id] = detectAnimationIntent(anim, elIntent);
  });

  return { elementIntents, animationIntents };
}

module.exports = { analyzeScene, summarizePromptComposition, INTENT };
