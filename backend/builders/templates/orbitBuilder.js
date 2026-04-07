'use strict';

const { detectHexColor } = require('../../processors/PromptClassifier');
const { createScene, pickVariant } = require('../builderUtils');

function buildOrbit(plan, prompt) {
  const palette = pickVariant(prompt, [
    { background: '#08111f', star: '#facc15' },
    { background: '#091425', star: '#f59e0b' },
    { background: '#071226', star: '#fde68a' }
  ]);
  const startPositions = pickVariant(prompt, [
    { x: 560, y: 225 },
    { x: 510, y: 120 },
    { x: 500, y: 320 }
  ]);
  const planetFill = plan?.subject?.color || detectHexColor(prompt, '#60a5fa');
  const starLabel = plan?.secondarySubjects?.[0]?.label || 'Star';
  const starFill = plan?.secondarySubjects?.[0]?.color || palette.star;

  return createScene(
    palette.background,
    [
      {
        id: 'star-core',
        type: 'circle',
        x: 400,
        y: 225,
        radius: 38,
        fill: starFill,
        opacity: 1
      },
      {
        id: 'planet-orbit',
        type: 'circle',
        x: startPositions.x,
        y: startPositions.y,
        radius: 20,
        fill: planetFill,
        opacity: 1,
        label: starLabel
      }
    ],
    [
      {
        id: 'planet-orbit-loop',
        target: 'planet-orbit',
        type: 'move',
        from: { x: startPositions.x, y: startPositions.y },
        to: { x: startPositions.x, y: startPositions.y },
        duration: 4.8,
        delay: 0,
        ease: 'none',
        repeat: -1,
        yoyo: false
      }
    ]
  );
}

module.exports = buildOrbit;
