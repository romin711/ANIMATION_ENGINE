'use strict';

const { detectHexColor } = require('../../processors/PromptClassifier');
const { createScene, pickVariant, slugify } = require('../builderUtils');

function resolveElementType(plan, prompt) {
  const lower = String(prompt || '').toLowerCase();
  const subjectType = plan?.subject?.type;

  if (subjectType === 'square') return 'rect';
  if (subjectType === 'planet' || subjectType === 'circle') return 'circle';
  if (lower.includes('rect') || lower.includes('square') || lower.includes('box')) return 'rect';
  return 'circle';
}

function buildTimelineForMotion(motionType, targetId, element, loop) {
  if (motionType === 'spin') {
    return [{
      id: targetId + '-rotate',
      target: targetId,
      type: 'rotate',
      from: { rotation: 0 },
      to: { rotation: 360 },
      duration: 2.4,
      delay: 0,
      ease: 'none',
      repeat: loop ? -1 : 0,
      yoyo: false
    }];
  }

  if (motionType === 'bounce') {
    return [{
      id: targetId + '-move',
      target: targetId,
      type: 'move',
      from: { x: element.x, y: element.y - 50 },
      to: { x: element.x, y: element.y + 70 },
      duration: 1.6,
      delay: 0,
      ease: 'bounce.out',
      repeat: loop ? -1 : 0,
      yoyo: true
    }];
  }

  if (motionType === 'pulse') {
    return [{
      id: targetId + '-scale',
      target: targetId,
      type: 'scale',
      from: { scaleX: 1, scaleY: 1 },
      to: { scaleX: 1.14, scaleY: 1.14 },
      duration: 1.3,
      delay: 0,
      ease: 'sine.inOut',
      repeat: loop ? -1 : 0,
      yoyo: true
    }];
  }

  if (motionType === 'fade' || motionType === 'reveal') {
    return [{
      id: targetId + '-fade',
      target: targetId,
      type: 'fade',
      from: { opacity: 0 },
      to: { opacity: 1 },
      duration: 1.1,
      delay: 0,
      ease: 'power2.out',
      repeat: 0,
      yoyo: false
    }];
  }

  return [{
    id: targetId + '-move',
    target: targetId,
    type: 'move',
    from: { x: element.x - 26, y: element.y + 18 },
    to: { x: element.x + 26, y: element.y - 18 },
    duration: 2.6,
    delay: 0,
    ease: 'sine.inOut',
    repeat: loop ? -1 : 0,
    yoyo: true
  }];
}

function buildBasicShape(plan, prompt) {
  const elementType = resolveElementType(plan, prompt);
  const palettes = pickVariant(prompt, [
    { background: '#0f172a', accent: '#e2e8f0' },
    { background: '#111827', accent: '#cbd5e1' },
    { background: '#0b1120', accent: '#dbeafe' }
  ]);
  const fill = plan?.subject?.color || detectHexColor(prompt, '#3b82f6');
  const motionType = plan?.motion?.type || 'float';
  const loop = plan?.motion?.loop !== false;
  const subjectIdCore = slugify(plan?.subject?.label || plan?.subject?.type || 'shape', 'shape');
  const motionId = motionType === 'bounce' ? 'bounce' : motionType === 'float' ? 'float' : 'main';
  const targetId = subjectIdCore + '-' + motionId;

  let mainElement;

  if (elementType === 'rect') {
    mainElement = {
      id: targetId,
      type: 'rect',
      x: 360,
      y: 185,
      width: 80,
      height: 80,
      rx: 14,
      fill,
      stroke: palettes.accent,
      strokeWidth: 2,
      opacity: 1
    };
  } else {
    mainElement = {
      id: targetId,
      type: 'circle',
      x: 400,
      y: 225,
      radius: 42,
      fill,
      stroke: palettes.accent,
      strokeWidth: 2,
      opacity: 1
    };
  }

  const timeline = buildTimelineForMotion(motionType, targetId, mainElement, loop);
  return createScene(palettes.background, [mainElement], timeline);
}

module.exports = buildBasicShape;
