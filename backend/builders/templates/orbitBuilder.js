'use strict';

const { detectHexColor } = require('../../processors/PromptClassifier');
const { createScene, pickVariant } = require('../builderUtils');

function roundTo(value, decimals) {
  const factor = Math.pow(10, decimals);
  return Math.round(value * factor) / factor;
}

function buildOrbit(plan, physicsModules, utils) {
  console.log('BUILDER_USED:', 'orbitBuilder');
  const prompt = plan?.prompt || '';
  const palette = pickVariant(prompt, [
    { background: '#08111f', star: '#facc15' },
    { background: '#091425', star: '#f59e0b' },
    { background: '#071226', star: '#fde68a' }
  ]);
  const orbitLayouts = pickVariant(prompt, [
    { radius: 154, startAngle: 8, period: 4.8 },
    { radius: 134, startAngle: -72, period: 4.4 },
    { radius: 172, startAngle: 118, period: 5.1 }
  ]);
  const { circularOrbit } = physicsModules.OrbitalMechanics;
  const { positionsToKeyframes } = physicsModules.MotionSolver;
  const planetFill = plan?.subject?.color || detectHexColor(prompt, '#60a5fa');
  const starFill = plan?.secondarySubjects?.[0]?.color || palette.star;
  const orbitPositions = circularOrbit({
    centerX: 400,
    centerY: 225,
    radius: orbitLayouts.radius,
    startAngle: orbitLayouts.startAngle,
    period: orbitLayouts.period,
    duration: orbitLayouts.period,
    sampleFPS: 30
  });
  const keyframes = positionsToKeyframes(orbitPositions);
  const first = orbitPositions[0];
  const last = orbitPositions[orbitPositions.length - 1];

  return createScene(
    palette.background,
    [
      {
        id: 'anchor-core',
        type: 'circle',
        x: 400,
        y: 225,
        radius: 38,
        fill: starFill,
        opacity: 1
      },
      {
        id: 'moving-core',
        type: 'circle',
        x: first.x,
        y: first.y,
        radius: 20,
        fill: planetFill,
        opacity: 1
      }
    ],
    [
      {
        id: 'moving-path',
        target: 'moving-core',
        type: 'move',
        from: { x: first.x, y: first.y },
        to: { x: last.x, y: last.y },
        keyframes,
        duration: roundTo(orbitLayouts.period, 3),
        delay: 0,
        ease: 'none',
        repeat: -1,
        yoyo: false
      }
    ]
  );
}

module.exports = buildOrbit;
