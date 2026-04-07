'use strict';

function createPromptHash(input) {
  const value = String(input || '');
  let hash = 0;

  for (let index = 0; index < value.length; index++) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0;
  }

  return hash || 1;
}

function pickVariant(prompt, options) {
  if (!Array.isArray(options) || options.length === 0) {
    return undefined;
  }

  const index = createPromptHash(prompt) % options.length;
  return options[index];
}

function slugify(value, fallback) {
  const slug = String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

  return slug || (fallback || 'item');
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function createScene(background, elements, timeline) {
  return {
    version: '1.0',
    canvas: {
      width: 800,
      height: 450,
      background
    },
    elements,
    timeline
  };
}

module.exports = {
  clamp,
  createPromptHash,
  createScene,
  pickVariant,
  slugify
};
