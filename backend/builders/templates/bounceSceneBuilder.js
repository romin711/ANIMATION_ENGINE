'use strict';

const { detectHexColor } = require('../../processors/PromptClassifier');

function roundTo(value, decimals) {
  const factor = Math.pow(10, decimals);
  return Math.round(value * factor) / factor;
}

function createSubjectElement(plan, fill, layout) {
  if (plan?.subject?.type === 'square') {
    return {
      id: 'main-subject',
      type: 'rect',
      x: layout.startX - 34,
      y: layout.startY - 34,
      width: 68,
      height: 68,
      rx: 12,
      fill,
      opacity: 1
    };
  }

  return {
    id: 'main-subject',
    type: 'circle',
    x: layout.startX,
    y: layout.startY,
    radius: 34,
    fill,
    opacity: 1
  };
}

function buildBounceScene(plan, physicsModules, utils) {
  console.log('BUILDER_USED:', 'bounceSceneBuilder');

  const prompt = plan?.prompt || '';
  const variant = utils.getVariantFromPrompt(prompt);
  const palette = [
    { background: '#0b1220', accent: '#f8fafc' },
    { background: '#111827', accent: '#e5e7eb' },
    { background: '#101828', accent: '#dbeafe' }
  ][variant];
  const layout = [
    { startX: 250, startY: 122, velocityX: 56, velocityY: -40, duration: 2.4 },
    { startX: 400, startY: 104, velocityX: 0, velocityY: -60, duration: 2.1 },
    { startX: 560, startY: 116, velocityX: -58, velocityY: -48, duration: 2.5 }
  ][variant];
  const fill = plan?.subject?.color || detectHexColor(prompt, '#f97316');
  const positions = physicsModules.PhysicsEngine.simulateGravityBounce({
    startX: layout.startX,
    startY: layout.startY,
    velocityX: layout.velocityX,
    velocityY: layout.velocityY,
    gravity: 690,
    restitution: 0.62,
    duration: layout.duration,
    sampleFPS: 24
  });
  const keyframes = physicsModules.MotionSolver.positionsToKeyframes(positions);
  const first = positions[0];
  const last = positions[positions.length - 1];
  const element = createSubjectElement(plan, fill, layout);

  return utils.createScene(
    palette.background,
    [element, {
      id: 'ground-strip',
      type: 'rect',
      x: 120,
      y: 396,
      width: 560,
      height: 8,
      rx: 4,
      fill: palette.accent,
      opacity: 0.28
    }],
    [{
      id: 'main-path',
      target: element.id,
      type: 'move',
      from: { x: first.x, y: first.y },
      to: { x: last.x, y: last.y },
      keyframes,
      duration: roundTo(layout.duration, 3),
      delay: variant * 0.05,
      ease: 'power1.out',
      repeat: plan?.motion?.loop === false ? 0 : -1,
      yoyo: false
    }]
  );
}

module.exports = buildBounceScene;
