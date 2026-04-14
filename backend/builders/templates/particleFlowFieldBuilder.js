'use strict';

const { detectHexColor } = require('../../processors/PromptClassifier');

function roundTo(value, decimals) {
  const factor = Math.pow(10, decimals);
  return Math.round(value * factor) / factor;
}

function buildParticleFlowField(plan, physicsModules, utils) {
  console.log('BUILDER_USED:', 'particleFlowFieldBuilder');

  const prompt = plan?.prompt || '';
  const variant = utils.getVariantFromPrompt(prompt);
  const palette = [
    { background: '#07111f', accent: '#38bdf8' },
    { background: '#0f172a', accent: '#2dd4bf' },
    { background: '#111827', accent: '#f472b6' }
  ][variant];
  const fill = plan?.subject?.color || detectHexColor(prompt, palette.accent);
  const tracks = [
    { startX: 80, startY: 152, amplitude: 34, frequency: 1.1 },
    { startX: 80, startY: 226, amplitude: 52, frequency: 1.4 },
    { startX: 80, startY: 304, amplitude: 38, frequency: 1.8 }
  ];

  const elements = tracks.map(function (track, index) {
    return {
      id: 'lane-node-' + index,
      type: 'circle',
      x: track.startX,
      y: track.startY,
      radius: index === 1 ? 12 : 9,
      fill,
      opacity: index === 1 ? 1 : 0.82
    };
  });

  const timeline = tracks.map(function (track, index) {
    const positions = physicsModules.WaveGenerator.sineWavePath({
      startX: track.startX,
      startY: track.startY,
      amplitude: track.amplitude + (variant * 6),
      frequency: track.frequency,
      travelDistance: 640,
      duration: 3.6 + (index * 0.12),
      sampleFPS: 24
    });

    return {
      id: 'lane-path-' + index,
      target: elements[index].id,
      type: 'move',
      from: positions[0],
      to: positions[positions.length - 1],
      keyframes: physicsModules.MotionSolver.positionsToKeyframes(positions),
      duration: roundTo(3.6 + (index * 0.12), 3),
      delay: index * 0.1,
      ease: 'none',
      repeat: plan?.motion?.loop === false ? 0 : -1,
      yoyo: false
    };
  });

  return utils.createScene(palette.background, elements, timeline);
}

module.exports = buildParticleFlowField;
