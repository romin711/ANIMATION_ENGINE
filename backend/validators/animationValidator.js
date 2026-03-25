'use strict';

/**
 * Validates an animation JSON object against our schema contract.
 * Returns { valid: true } or { valid: false, errors: string[] }
 * @param {any} data - The parsed JSON to validate
 * @returns {{ valid: boolean, errors: string[] }}
 */
function validateAnimationJSON(data) {
  const errors = [];

  if (!data || typeof data !== 'object') {
    return { valid: false, errors: ['Root value must be a JSON object'] };
  }

  // --- Top-level fields ---
  if (data.version !== '1.0') {
    errors.push('Missing or invalid "version". Expected "1.0".');
  }

  // --- Canvas ---
  if (!data.canvas || typeof data.canvas !== 'object') {
    errors.push('Missing "canvas" object.');
  } else {
    if (typeof data.canvas.width !== 'number') errors.push('"canvas.width" must be a number.');
    if (typeof data.canvas.height !== 'number') errors.push('"canvas.height" must be a number.');
    if (typeof data.canvas.background !== 'string') errors.push('"canvas.background" must be a string (hex color).');
  }

  // --- Elements ---
  if (!Array.isArray(data.elements) || data.elements.length === 0) {
    errors.push('"elements" must be a non-empty array.');
  } else {
    const validTypes = ['circle', 'rect', 'text'];
    const elementIds = new Set();

    data.elements.forEach(function (el, idx) {
      const prefix = 'elements[' + idx + ']';

      if (!el.id || typeof el.id !== 'string') {
        errors.push(prefix + ': "id" must be a non-empty string.');
      } else if (elementIds.has(el.id)) {
        errors.push(prefix + ': duplicate element id "' + el.id + '".');
      } else {
        elementIds.add(el.id);
      }

      if (!validTypes.includes(el.type)) {
        errors.push(prefix + ': "type" must be one of: ' + validTypes.join(', ') + '.');
      }

      if (typeof el.x !== 'number') errors.push(prefix + ': "x" must be a number.');
      if (typeof el.y !== 'number') errors.push(prefix + ': "y" must be a number.');

      if (el.type === 'circle' && typeof el.radius !== 'number') {
        errors.push(prefix + ': "radius" must be a number for type "circle".');
      }
      if (el.type === 'rect') {
        if (typeof el.width !== 'number') errors.push(prefix + ': "width" must be a number for type "rect".');
        if (typeof el.height !== 'number') errors.push(prefix + ': "height" must be a number for type "rect".');
      }
      if (el.type === 'text' && typeof el.content !== 'string') {
        errors.push(prefix + ': "content" must be a string for type "text".');
      }
    });
  }

  // --- Timeline ---
  if (!Array.isArray(data.timeline) || data.timeline.length === 0) {
    errors.push('"timeline" must be a non-empty array.');
  } else {
    const validAnimTypes = ['move', 'fade', 'scale', 'rotate', 'color'];
    const elementIds = new Set((data.elements || []).map(function (el) { return el.id; }));

    data.timeline.forEach(function (anim, idx) {
      const prefix = 'timeline[' + idx + ']';

      if (!anim.id || typeof anim.id !== 'string') {
        errors.push(prefix + ': "id" must be a non-empty string.');
      }
      if (!anim.target || !elementIds.has(anim.target)) {
        errors.push(prefix + ': "target" must reference a valid element id. Got: "' + anim.target + '".');
      }
      if (!validAnimTypes.includes(anim.type)) {
        errors.push(prefix + ': "type" must be one of: ' + validAnimTypes.join(', ') + '.');
      }
      if (typeof anim.duration !== 'number' || anim.duration <= 0) {
        errors.push(prefix + ': "duration" must be a positive number.');
      }
      if (!anim.to || typeof anim.to !== 'object') {
        errors.push(prefix + ': "to" must be an object with target properties.');
      }
    });
  }

  return {
    valid: errors.length === 0,
    errors: errors
  };
}

module.exports = { validateAnimationJSON };
