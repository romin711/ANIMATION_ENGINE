'use strict';

const COLOR_MAP = [
  ['crimson', '#dc2626'],
  ['scarlet', '#ef4444'],
  ['red', '#ef4444'],
  ['orange', '#f97316'],
  ['amber', '#f59e0b'],
  ['gold', '#f59e0b'],
  ['yellow', '#facc15'],
  ['lime', '#84cc16'],
  ['green', '#22c55e'],
  ['emerald', '#10b981'],
  ['teal', '#14b8a6'],
  ['cyan', '#06b6d4'],
  ['sky', '#38bdf8'],
  ['blue', '#3b82f6'],
  ['indigo', '#6366f1'],
  ['violet', '#8b5cf6'],
  ['purple', '#8b5cf6'],
  ['magenta', '#d946ef'],
  ['pink', '#ec4899'],
  ['rose', '#f43f5e'],
  ['white', '#f8fafc'],
  ['silver', '#cbd5e1'],
  ['gray', '#94a3b8'],
  ['grey', '#94a3b8'],
  ['black', '#111827']
];

const SUBJECT_DEFINITIONS = [
  { keywords: ['candlestick', 'candle stick', 'candle bar'], type: 'candlestick', label: 'Candlestick Pattern' },
  { keywords: ['planet'], type: 'planet', label: 'Planet' },
  { keywords: ['moon'], type: 'planet', label: 'Moon' },
  { keywords: ['satellite'], type: 'planet', label: 'Satellite' },
  { keywords: ['sun'], type: 'custom', label: 'Sun' },
  { keywords: ['star'], type: 'custom', label: 'Star' },
  { keywords: ['square', 'box', 'cube'], type: 'square', label: 'Square' },
  { keywords: ['rectangle', 'rect'], type: 'square', label: 'Rectangle' },
  { keywords: ['circle', 'orb', 'sphere', 'dot'], type: 'circle', label: 'Circle' },
  { keywords: ['ball'], type: 'circle', label: 'Ball' },
  { keywords: ['bubble'], type: 'circle', label: 'Bubble' },
  { keywords: ['text', 'title', 'headline', 'caption', 'word'], type: 'text', label: 'Text' },
  { keywords: ['label'], type: 'text', label: 'Label' },
  { keywords: ['logo'], type: 'custom', label: 'Logo' },
  { keywords: ['icon'], type: 'custom', label: 'Icon' },
  { keywords: ['city'], type: 'custom', label: 'City' },
  { keywords: ['skyline'], type: 'custom', label: 'Skyline' },
  { keywords: ['building', 'buildings'], type: 'custom', label: 'Buildings' },
  { keywords: ['particle', 'particles'], type: 'custom', label: 'Particles' },
  { keywords: ['wave', 'waves'], type: 'custom', label: 'Wave' },
  { keywords: ['ring'], type: 'custom', label: 'Ring' },
  { keywords: ['triangle'], type: 'custom', label: 'Triangle' },
  { keywords: ['hexagon'], type: 'custom', label: 'Hexagon' },
  { keywords: ['line', 'lines'], type: 'custom', label: 'Lines' }
];

const MOTION_DEFINITIONS = [
  { keywords: ['orbiting', 'orbit', 'revolving', 'circling'], type: 'orbit' },
  { keywords: ['spinning', 'spin', 'rotating', 'rotate'], type: 'spin' },
  { keywords: ['bouncing', 'bounce', 'falling', 'fall', 'dropping', 'drop'], type: 'bounce' },
  { keywords: ['floating', 'float', 'drifting', 'drift', 'hovering', 'hover'], type: 'float' },
  { keywords: ['pulsing', 'pulse', 'beating', 'beat'], type: 'pulse' },
  { keywords: ['fading', 'fade', 'dissolving'], type: 'fade' },
  { keywords: ['revealing', 'reveal', 'showing', 'show', 'appearing', 'appear'], type: 'reveal' }
];

function normalizePrompt(prompt) {
  return String(prompt || '').trim().replace(/\s+/g, ' ');
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function extractQuotedText(prompt) {
  const value = normalizePrompt(prompt);
  const doubleQuoted = value.match(/["“]([^"”]{1,60})["”]/);
  if (doubleQuoted) return doubleQuoted[1].trim();

  const singleQuoted = value.match(/'([^']{1,60})'/);
  if (singleQuoted) return singleQuoted[1].trim();

  return '';
}

function detectHexColor(prompt, fallback) {
  const raw = String(prompt || '');
  const hexMatch = raw.match(/#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})/);
  if (hexMatch) return hexMatch[0].toLowerCase();

  const lower = raw.toLowerCase();
  for (const entry of COLOR_MAP) {
    if (lower.includes(entry[0])) return entry[1];
  }

  return fallback || '#3b82f6';
}

function extractColorMentions(prompt) {
  const normalized = normalizePrompt(prompt);
  const lower = normalized.toLowerCase();
  const mentions = [];

  const hexRegex = /#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})/g;
  let hexMatch = hexRegex.exec(normalized);
  while (hexMatch) {
    mentions.push({
      index: hexMatch.index,
      label: hexMatch[0].toLowerCase(),
      color: hexMatch[0].toLowerCase()
    });
    hexMatch = hexRegex.exec(normalized);
  }

  COLOR_MAP.forEach(function (entry) {
    const pattern = new RegExp('\\b' + escapeRegExp(entry[0]) + '\\b', 'g');
    let match = pattern.exec(lower);
    while (match) {
      mentions.push({
        index: match.index,
        label: entry[0],
        color: entry[1]
      });
      match = pattern.exec(lower);
    }
  });

  return mentions.sort(function (left, right) {
    return left.index - right.index;
  });
}

function inferColorForSubject(prompt, subjectIndex, fallback) {
  const normalized = normalizePrompt(prompt);
  const colors = extractColorMentions(normalized);

  if (colors.length === 0) {
    return fallback || '#3b82f6';
  }

  let best = null;
  let bestScore = Number.POSITIVE_INFINITY;

  colors.forEach(function (mention) {
    const distance = Math.abs(subjectIndex - mention.index);
    const betweenStart = Math.min(subjectIndex, mention.index);
    const betweenEnd = Math.max(subjectIndex, mention.index);
    const between = normalized.slice(betweenStart, betweenEnd).toLowerCase();
    let score = distance;

    if (mention.index <= subjectIndex) {
      score -= 10;
    } else {
      score += 12;
    }

    if (/\b(with|and|plus|around|orbiting)\b/.test(between)) {
      score += 18;
    }

    if (between.trim().split(/\s+/).filter(Boolean).length > 4) {
      score += 18;
    }

    if (score < bestScore) {
      best = mention;
      bestScore = score;
    }
  });

  return best?.color || fallback || '#3b82f6';
}

function findKeywordIndex(lower, keywords) {
  let bestIndex = -1;

  keywords.forEach(function (keyword) {
    const index = lower.indexOf(keyword);
    if (index !== -1 && (bestIndex === -1 || index < bestIndex)) {
      bestIndex = index;
    }
  });

  return bestIndex;
}

function extractSubjectMentions(prompt) {
  const normalized = normalizePrompt(prompt);
  const lower = normalized.toLowerCase();
  let mentions = [];
  const seen = new Set();
  const quotedText = extractQuotedText(normalized);

  SUBJECT_DEFINITIONS.forEach(function (definition) {
    const index = findKeywordIndex(lower, definition.keywords);
    if (index === -1) return;

    const key = definition.type + ':' + definition.label;
    if (seen.has(key)) return;

    seen.add(key);
    mentions.push({
      index,
      type: definition.type,
      label: definition.label,
      color: inferColorForSubject(normalized, index, detectHexColor(normalized))
    });
  });

  if (quotedText) {
    const quoteIndex = normalized.indexOf(quotedText);
    mentions.push({
      index: quoteIndex === -1 ? 0 : quoteIndex,
      type: 'text',
      label: quotedText,
      color: inferColorForSubject(normalized, quoteIndex, detectHexColor(normalized, '#f8fafc'))
    });
  }

  if (quotedText) {
    mentions = mentions.filter(function (mention) {
      return !(mention.type === 'text' && mention.label === 'Text');
    });
  }

  return mentions.sort(function (left, right) {
    return left.index - right.index;
  });
}

function detectSubjectType(prompt) {
  const mentions = extractSubjectMentions(prompt);
  return mentions[0]?.type || 'custom';
}

function detectMotionType(prompt) {
  const lower = normalizePrompt(prompt).toLowerCase();

  for (const definition of MOTION_DEFINITIONS) {
    if (definition.keywords.some(function (keyword) { return lower.includes(keyword); })) {
      return definition.type;
    }
  }

  return 'float';
}

function detectComplexity(prompt) {
  const normalized = normalizePrompt(prompt);
  const lower = normalized.toLowerCase();
  const wordCount = normalized.split(' ').filter(Boolean).length;
  const subjectMentions = extractSubjectMentions(normalized);
  let score = 0;

  if (wordCount > 6) score += 1;
  if (wordCount > 10) score += 1;
  if (subjectMentions.length > 1) score += 2;
  if (lower.includes(' with ') || lower.includes(' and ') || lower.includes(' plus ')) score += 1;
  if (lower.includes('cinematic') || lower.includes('futuristic') || lower.includes('detailed') || lower.includes('neon')) score += 2;

  if (score >= 4) return 'rich';
  if (score >= 2) return 'medium';
  return 'basic';
}

function detectMood(prompt) {
  const lower = normalizePrompt(prompt).toLowerCase();

  if (lower.includes('futuristic') || lower.includes('neon') || lower.includes('cyber')) return 'futuristic';
  if (lower.includes('cinematic') || lower.includes('dramatic') || lower.includes('epic')) return 'dramatic';
  if (lower.includes('playful') || lower.includes('fun') || lower.includes('cute')) return 'playful';
  if (lower.includes('calm') || lower.includes('gentle') || lower.includes('soft') || lower.includes('minimal')) return 'calm';

  return 'clean';
}

function buildSubjectLabel(prompt, subjectType) {
  const mentions = extractSubjectMentions(prompt);
  const quotedText = extractQuotedText(prompt);
  if (subjectType === 'text' && quotedText) {
    return quotedText;
  }
  const first = mentions[0];

  if (first && first.type === subjectType) {
    return first.label;
  }

  return 'Abstract Form';
}

function pickOrbitSubjects(mentions, prompt) {
  const lower = normalizePrompt(prompt).toLowerCase();
  const orbitingSubject = mentions.find(function (mention) {
    return mention.type === 'planet' || mention.label === 'Moon' || mention.label === 'Satellite';
  }) || mentions.find(function (mention) {
    return mention.type === 'circle';
  }) || {
    type: 'planet',
    label: 'Planet',
    color: detectHexColor(prompt, '#60a5fa')
  };

  const centralBody = mentions.find(function (mention) {
    return mention.label === 'Sun' || mention.label === 'Star';
  }) || {
    type: 'custom',
    label: lower.includes('sun') ? 'Sun' : 'Star',
    color: lower.includes('sun') ? '#f59e0b' : '#facc15'
  };

  return {
    subject: orbitingSubject,
    secondarySubjects: [centralBody]
  };
}

function buildSecondarySubjects(prompt, sceneType, primarySubject) {
  const mentions = extractSubjectMentions(prompt);
  const quotedText = extractQuotedText(prompt);

  if (sceneType === 'orbit') {
    return pickOrbitSubjects(mentions, prompt).secondarySubjects;
  }

  return mentions
    .filter(function (mention) {
      if (primarySubject.type === 'text' && mention.type === 'text' && mention.label === quotedText) {
        return false;
      }
      return mention.label !== primarySubject.label || mention.type !== primarySubject.type;
    })
    .slice(0, 2)
    .map(function (mention) {
      return {
        type: mention.type,
        label: mention.label,
        color: mention.color
      };
    });
}

function inferSceneType(prompt, subjectType, motionType) {
  const lower = normalizePrompt(prompt).toLowerCase();
  const mentions = extractSubjectMentions(prompt);
  const quotedText = extractQuotedText(prompt);
  const effectiveMentionCount = subjectType === 'text' && quotedText
    ? mentions.filter(function (mention) {
        return !(mention.type === 'text' && mention.label !== quotedText);
      }).length
    : mentions.length;

  if (motionType === 'orbit') return 'orbit';
  if (subjectType === 'candlestick') return 'chart';
  if (subjectType === 'text' && effectiveMentionCount <= 1) return 'text';
  if (effectiveMentionCount > 1 || lower.includes(' with ') || lower.includes(' and ') || lower.includes(' plus ')) return 'multi-object';
  if (subjectType === 'custom') return 'abstract';
  return 'single-object';
}

function createIntentPlan(prompt, overrides) {
  const normalized = normalizePrompt(prompt);
  const mentions = extractSubjectMentions(normalized);
  const motionType = detectMotionType(normalized);
  const defaultSubjectType = mentions[0]?.type || 'custom';
  const sceneType = inferSceneType(normalized, defaultSubjectType, motionType);
  const orbitSubjects = sceneType === 'orbit' ? pickOrbitSubjects(mentions, normalized) : null;
  const primarySubject = orbitSubjects
    ? orbitSubjects.subject
    : {
        type: defaultSubjectType,
        label: buildSubjectLabel(normalized, defaultSubjectType),
        color: mentions[0]?.color || detectHexColor(normalized)
      };
  const basePlan = {
    version: '1.0',
    sceneType,
    subject: {
      type: primarySubject.type,
      label: primarySubject.label,
      color: primarySubject.color || detectHexColor(normalized)
    },
    secondarySubjects: orbitSubjects
      ? orbitSubjects.secondarySubjects
      : buildSecondarySubjects(normalized, sceneType, primarySubject),
    motion: {
      type: motionType,
      loop: ['spin', 'orbit', 'bounce', 'float', 'pulse'].includes(motionType)
    },
    style: {
      complexity: detectComplexity(normalized),
      mood: detectMood(normalized)
    }
  };

  return Object.assign({}, basePlan, overrides || {});
}

function isCandlestickPrompt(lower) {
  return lower.includes('candlestick') || lower.includes('candle stick') || lower.includes('candle bar');
}

function isOrbitPrompt(plan) {
  return plan.sceneType === 'orbit' && plan.subject.type === 'planet';
}

function isTextPrompt(plan, normalized) {
  return plan.sceneType === 'text'
    || Boolean(extractQuotedText(normalized))
    || plan.subject.type === 'text';
}

function isSimpleBasicShapePrompt(plan, lower) {
  if (plan.sceneType !== 'single-object') return false;
  if (!['square', 'circle'].includes(plan.subject.type)) return false;
  if (plan.style.complexity !== 'basic') return false;
  if (plan.secondarySubjects.length > 0) return false;
  if (lower.includes(' with ') || lower.includes(' and ') || lower.includes(' plus ')) return false;
  if (lower.includes('particle') || lower.includes('background') || lower.includes('trail')) return false;
  return true;
}

function classifyPrompt(prompt) {
  const normalized = normalizePrompt(prompt);
  const lower = normalized.toLowerCase();
  const plan = createIntentPlan(normalized);

  if (isCandlestickPrompt(lower)) {
    return { kind: 'template', template: 'candlestick', plan };
  }

  if (isOrbitPrompt(plan)) {
    return { kind: 'template', template: 'orbit', plan };
  }

  if (isTextPrompt(plan, normalized) && plan.secondarySubjects.length === 0) {
    return { kind: 'template', template: 'text', plan };
  }

  if (isSimpleBasicShapePrompt(plan, lower)) {
    return { kind: 'template', template: 'basic-shape', plan };
  }

  return { kind: 'planner', plan };
}

module.exports = {
  classifyPrompt,
  createIntentPlan,
  detectHexColor,
  detectMotionType,
  detectSubjectType,
  extractQuotedText,
  extractSubjectMentions,
  normalizePrompt
};
