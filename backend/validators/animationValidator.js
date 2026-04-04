'use strict';

const VALID_ELEMENT_TYPES   = ['circle', 'rect', 'text'];
const VALID_ANIMATION_TYPES = ['move', 'fade', 'scale', 'rotate', 'color', 'blur'];
const VALID_FONT_WEIGHTS    = ['normal', 'bold'];
const HEX_RE                = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

function isHex(v)              { return typeof v === 'string' && HEX_RE.test(v); }
function isPositiveNum(v)      { return typeof v === 'number' && v > 0; }
function isNonNegativeNum(v)   { return typeof v === 'number' && v >= 0; }
function inRange(v, lo, hi)    { return typeof v === 'number' && v >= lo && v <= hi; }

function validateAnimationJSON(data) {
  const errors = [];

  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    return { valid: false, errors: ['Root value must be a JSON object.'] };
  }

  // ── version ──────────────────────────────────────────────────────────────
  if (data.version !== '1.0') {
    errors.push('Missing or invalid "version". Expected "1.0".');
  }

  // ── canvas ────────────────────────────────────────────────────────────────
  if (!data.canvas || typeof data.canvas !== 'object') {
    errors.push('Missing "canvas" object.');
  } else {
    if (!isPositiveNum(data.canvas.width))   errors.push('"canvas.width" must be a positive number.');
    if (!isPositiveNum(data.canvas.height))  errors.push('"canvas.height" must be a positive number.');
    if (!isHex(data.canvas.background))      errors.push('"canvas.background" must be a hex color.');
  }

  // ── elements ─────────────────────────────────────────────────────────────
  if (!Array.isArray(data.elements) || data.elements.length === 0) {
    errors.push('"elements" must be a non-empty array.');
  } else {
    const ids = new Set();
    data.elements.forEach((el, idx) => {
      const p = 'elements[' + idx + ']';

      if (!el.id || typeof el.id !== 'string') {
        errors.push(p + ': "id" must be a non-empty string.');
      } else if (ids.has(el.id)) {
        errors.push(p + ': duplicate id "' + el.id + '".');
      } else {
        ids.add(el.id);
      }

      if (!VALID_ELEMENT_TYPES.includes(el.type))  errors.push(p + ': "type" must be circle, rect, or text.');
      if (typeof el.x !== 'number')                 errors.push(p + ': "x" must be a number.');
      if (typeof el.y !== 'number')                 errors.push(p + ': "y" must be a number.');
      if (!isHex(el.fill))                          errors.push(p + ': "fill" must be a hex color.');
      if (!inRange(el.opacity, 0, 1))               errors.push(p + ': "opacity" must be 0–1.');

      if (el.stroke      !== undefined && !isHex(el.stroke))              errors.push(p + ': "stroke" must be a hex color.');
      if (el.strokeWidth !== undefined && !isNonNegativeNum(el.strokeWidth)) errors.push(p + ': "strokeWidth" must be >= 0.');
      if (el.blur        !== undefined && !inRange(el.blur, 0, 20))       errors.push(p + ': "blur" must be 0–20.');

      if (el.type === 'circle') {
        if (!isPositiveNum(el.radius)) errors.push(p + ': "radius" must be a positive number.');
      }
      if (el.type === 'rect') {
        if (!isPositiveNum(el.width))  errors.push(p + ': "width" must be a positive number.');
        if (!isPositiveNum(el.height)) errors.push(p + ': "height" must be a positive number.');
        if (el.rx !== undefined && !inRange(el.rx, 0, 500)) errors.push(p + ': "rx" must be 0–500.');
      }
      if (el.type === 'text') {
        if (typeof el.content !== 'string' || !el.content.trim()) errors.push(p + ': "content" must be a non-empty string.');
        if (!isPositiveNum(el.fontSize))                           errors.push(p + ': "fontSize" must be a positive number.');
        if (el.fontWeight !== undefined && !VALID_FONT_WEIGHTS.includes(el.fontWeight))
          errors.push(p + ': "fontWeight" must be "normal" or "bold".');
      }
    });
  }

  // ── timeline ─────────────────────────────────────────────────────────────
  if (!Array.isArray(data.timeline) || data.timeline.length === 0) {
    errors.push('"timeline" must be a non-empty array.');
  } else {
    const elementIds = new Set((data.elements || []).map(el => el.id));

    data.timeline.forEach((anim, idx) => {
      const p = 'timeline[' + idx + ']';

      if (!anim.id || typeof anim.id !== 'string')          errors.push(p + ': "id" must be a non-empty string.');
      if (!anim.target || !elementIds.has(anim.target))     errors.push(p + ': "target" must reference a valid element id. Got: "' + anim.target + '".');
      if (!VALID_ANIMATION_TYPES.includes(anim.type))       errors.push(p + ': "type" must be one of: ' + VALID_ANIMATION_TYPES.join(', ') + '.');
      if (!isPositiveNum(anim.duration))                    errors.push(p + ': "duration" must be a positive number.');
      if (anim.delay   !== undefined && !isNonNegativeNum(anim.delay))   errors.push(p + ': "delay" must be >= 0.');
      if (anim.ease    !== undefined && typeof anim.ease !== 'string')   errors.push(p + ': "ease" must be a string.');
      if (anim.repeat  !== undefined && typeof anim.repeat !== 'number') errors.push(p + ': "repeat" must be a number.');
      if (anim.yoyo    !== undefined && typeof anim.yoyo !== 'boolean')  errors.push(p + ': "yoyo" must be a boolean.');

      // An animation must have EITHER from/to OR keyframes (or both as fallback)
      const hasFromTo    = anim.to && typeof anim.to === 'object';
      const hasKeyframes = Array.isArray(anim.keyframes) && anim.keyframes.length >= 2;

      if (!hasFromTo && !hasKeyframes) {
        errors.push(p + ': must have either "to" object or "keyframes" array.');
      }

      // Validate keyframes structure if present
      if (hasKeyframes) {
        anim.keyframes.forEach((kf, ki) => {
          const kp = p + '.keyframes[' + ki + ']';
          if (typeof kf.time !== 'number' || kf.time < 0 || kf.time > 1) {
            errors.push(kp + ': "time" must be a number between 0 and 1.');
          }
        });
      }
    });
  }

  return { valid: errors.length === 0, errors };
}

module.exports = { validateAnimationJSON }; 