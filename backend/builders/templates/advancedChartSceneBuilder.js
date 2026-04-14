'use strict';

function buildAdvancedChartScene(plan, physicsModules, utils) {
  console.log('BUILDER_USED:', 'advancedChartSceneBuilder');

  const prompt = plan?.prompt || '';
  const variant = utils.getVariantFromPrompt(prompt);
  const palette = [
    { background: '#07111f', up: '#22c55e', down: '#ef4444', accent: '#e0f2fe' },
    { background: '#0f172a', up: '#10b981', down: '#f87171', accent: '#bae6fd' },
    { background: '#111827', up: '#34d399', down: '#fb7185', accent: '#fce7f3' }
  ][variant];
  const barsByVariant = [
    [84, 120, 66, 138, 102],
    [64, 112, 92, 144, 118],
    [96, 72, 128, 104, 142]
  ][variant];

  const elements = barsByVariant.map(function (height, index) {
    const fill = index % 2 === 0 ? palette.down : palette.up;
    return {
      id: 'chart-bar-' + index,
      type: 'rect',
      x: 174 + (index * 74),
      y: 322 - height,
      width: 44,
      height: height,
      rx: 4,
      fill: index === 4 ? (plan?.subject?.color || palette.up) : fill,
      opacity: 1 - (index * 0.05)
    };
  });

  elements.push({
    id: 'chart-axis',
    type: 'rect',
    x: 150,
    y: 324,
    width: 408,
    height: 4,
    rx: 2,
    fill: palette.accent,
    opacity: 0.52
  });
  elements.push({
    id: 'chart-label',
    type: 'text',
    x: 176,
    y: 114,
    content: plan?.subject?.label || 'Advanced Chart',
    fontSize: 28,
    fontWeight: 'bold',
    fill: palette.accent,
    opacity: 1
  });

  const timeline = elements.map(function (element, index) {
    if (element.type === 'text') {
      return {
        id: 'chart-label-anim',
        target: element.id,
        type: 'fade',
        from: { opacity: 0 },
        to: { opacity: 1 },
        duration: 0.8,
        delay: 0.06,
        ease: 'power2.out',
        repeat: 0,
        yoyo: false
      };
    }

    return {
      id: 'chart-anim-' + index,
      target: element.id,
      type: 'fade',
      from: { opacity: 0 },
      to: { opacity: element.opacity || 1 },
      duration: 0.72 + (index * 0.06),
      delay: index * (0.05 + (variant * 0.01)),
      ease: 'power2.out',
      repeat: 0,
      yoyo: false
    };
  });

  return utils.createScene(palette.background, elements, timeline);
}

module.exports = buildAdvancedChartScene;
