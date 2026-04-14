'use strict';

const { extractQuotedText } = require('../../processors/PromptClassifier');

function buildSkylineScene(plan, physicsModules, utils) {
  console.log('BUILDER_USED:', 'skylineSceneBuilder');

  const prompt = plan?.prompt || '';
  const variant = utils.getVariantFromPrompt(prompt);
  const palette = [
    { background: '#07111f', skyline: '#22d3ee', accent: '#bae6fd' },
    { background: '#0f172a', skyline: '#38bdf8', accent: '#e0f2fe' },
    { background: '#111827', skyline: '#f59e0b', accent: '#fde68a' }
  ][variant];
  const skylineColor = plan?.subject?.color || palette.skyline;
  const title = extractQuotedText(prompt);
  const buildingSets = [
    [96, 148, 108, 170, 120],
    [118, 132, 92, 158, 134],
    [104, 162, 116, 140, 94]
  ][variant];

  const buildings = buildingSets.map(function (height, index) {
    return {
      id: 'city-block-' + index,
      type: 'rect',
      x: 136 + (index * 98),
      y: 322 - height,
      width: index % 2 === 0 ? 56 : 64,
      height: height,
      rx: 8,
      fill: index % 2 === 0 ? skylineColor : palette.accent,
      opacity: 0.94
    };
  });

  const accents = [
    { x: 598, y: 124, r: 16 },
    { x: 612, y: 218, r: 10 },
    { x: 646, y: 248, r: 4 },
    { x: 568, y: 266, r: 5 }
  ].map(function (dot, index) {
    return {
      id: 'accent-node-' + index,
      type: 'circle',
      x: dot.x + (variant === 2 ? -18 : 0),
      y: dot.y + (variant === 1 ? 12 : 0),
      radius: dot.r,
      fill: palette.accent,
      opacity: index === 0 ? 0.9 : 0.62
    };
  });

  const elements = buildings.concat([{
    id: 'ground-strip',
    type: 'rect',
    x: 110,
    y: 326,
    width: 580,
    height: 6,
    rx: 3,
    fill: palette.accent,
    opacity: 0.34
  }], accents);

  if (title) {
    elements.push({
      id: 'sky-title',
      type: 'text',
      x: Math.max(110, 400 - (title.length * 10)),
      y: 118 + (variant * 8),
      content: title,
      fontSize: 32,
      fontWeight: 'bold',
      fill: plan?.secondarySubjects?.find(function (subject) {
        return subject?.type === 'text';
      })?.color || palette.accent,
      opacity: 1
    });
  }

  const timeline = elements.map(function (element, index) {
    if (element.type === 'text') {
      return {
        id: 'sky-title-anim',
        target: element.id,
        type: 'move',
        from: { x: element.x, y: element.y + 16 },
        to: { x: element.x, y: element.y },
        duration: 1,
        delay: 0.08,
        ease: 'power2.out',
        repeat: 0,
        yoyo: false
      };
    }

    if (element.id.startsWith('accent-node-')) {
      return {
        id: 'accent-anim-' + index,
        target: element.id,
        type: 'move',
        from: { x: element.x - 10, y: element.y + 8 },
        to: { x: element.x + 10, y: element.y - 8 },
        duration: 2.4 + (index * 0.12),
        delay: index * 0.06,
        ease: 'sine.inOut',
        repeat: -1,
        yoyo: true
      };
    }

    return {
      id: 'city-anim-' + index,
      target: element.id,
      type: 'fade',
      from: { opacity: element.id === 'ground-strip' ? 0.14 : 0 },
      to: { opacity: element.opacity || 1 },
      duration: 0.8 + (index * 0.06),
      delay: index * 0.05,
      ease: 'power2.out',
      repeat: 0,
      yoyo: false
    };
  });

  return utils.createScene(palette.background, elements, timeline);
}

module.exports = buildSkylineScene;
