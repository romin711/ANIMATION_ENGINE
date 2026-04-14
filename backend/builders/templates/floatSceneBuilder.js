'use strict';

const { detectHexColor } = require('../../processors/PromptClassifier');

function roundTo(value, decimals) {
  const factor = Math.pow(10, decimals);
  return Math.round(value * factor) / factor;
}

function buildElement(plan, fill, origin) {
  if (plan?.subject?.type === 'square') {
    return {
      id: 'main-subject',
      type: 'rect',
      x: origin.x - 32,
      y: origin.y - 32,
      width: 64,
      height: 64,
      rx: 12,
      fill,
      opacity: 1
    };
  }

  return {
    id: 'main-subject',
    type: 'circle',
    x: origin.x,
    y: origin.y,
    radius: 34,
    fill,
    opacity: 1
  };
}

function buildFloatScene(plan, physicsModules, utils) {
  console.log('BUILDER_USED:', 'floatSceneBuilder');

  const prompt = plan?.prompt || '';
  const variant = utils.getVariantFromPrompt(prompt);
  const palette = [
    { background: '#08111f', accent: '#93c5fd' },
    { background: '#102a43', accent: '#a5f3fc' },
    { background: '#111827', accent: '#f9a8d4' }
  ][variant];
  const origins = [
    { x: 250, y: 225, rangeX: 72, rangeY: 46, duration: 3.8 },
    { x: 400, y: 205, rangeX: 58, rangeY: 62, duration: 4.1 },
    { x: 555, y: 230, rangeX: 82, rangeY: 50, duration: 3.9 }
  ][variant];
  const fill = plan?.subject?.color || detectHexColor(prompt, '#38bdf8');
  const positions = physicsModules.WaveGenerator.organicFloatPath({
    startX: origins.x,
    startY: origins.y,
    rangeX: origins.rangeX,
    rangeY: origins.rangeY,
    duration: origins.duration,
    sampleFPS: 24,
    seed: utils.createPromptHash(prompt) + variant
  });
  const keyframes = physicsModules.MotionSolver.positionsToKeyframes(positions);
  const first = positions[0];
  const last = positions[positions.length - 1];
  const element = buildElement(plan, fill, origins);

  return utils.createScene(
    palette.background,
    [element],
    [{
      id: 'main-path',
      target: element.id,
      type: 'move',
      from: { x: first.x, y: first.y },
      to: { x: last.x, y: last.y },
      keyframes,
      duration: roundTo(origins.duration, 3),
      delay: variant * 0.04,
      ease: 'sine.inOut',
      repeat: plan?.motion?.loop === false ? 0 : -1,
      yoyo: false
    }]
  );
}

module.exports = buildFloatScene;
