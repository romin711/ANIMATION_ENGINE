'use strict';

const { createScene, pickVariant } = require('../builderUtils');

function buildCandlestick(plan, physicsModules, utils) {
  console.log('BUILDER_USED:', 'candlestickBuilder');
  const prompt = plan?.prompt || 'candlestick';
  const variant = utils.getVariantFromPrompt(prompt);
  const palette = pickVariant(prompt, [
    { background: '#0b1220', up: '#22c55e', down: '#ef4444' },
    { background: '#0f172a', up: '#10b981', down: '#f87171' },
    { background: '#111827', up: '#34d399', down: '#fb7185' }
  ]);
  const candleSets = [
    [
      { x: 190, y: 190, height: 82, fill: palette.up },
      { x: 300, y: 160, height: 112, fill: palette.down },
      { x: 410, y: 178, height: 94, fill: palette.up },
      { x: 520, y: 145, height: 127, fill: palette.down }
    ],
    [
      { x: 190, y: 212, height: 60, fill: palette.down },
      { x: 300, y: 168, height: 104, fill: palette.up },
      { x: 410, y: 150, height: 122, fill: palette.up },
      { x: 520, y: 184, height: 88, fill: palette.down }
    ],
    [
      { x: 190, y: 176, height: 96, fill: palette.up },
      { x: 300, y: 206, height: 66, fill: palette.down },
      { x: 410, y: 154, height: 118, fill: palette.up },
      { x: 520, y: 170, height: 102, fill: palette.up }
    ]
  ];

  const candles = candleSets[variant].map(function (candle, index) {
    return {
      id: 'candle-body-' + (index + 1),
      x: candle.x,
      y: candle.y,
      width: 34,
      height: candle.height,
      fill: candle.fill
    };
  });

  const elements = candles.map(function (candle) {
    return {
      id: candle.id,
      type: 'rect',
      x: candle.x,
      y: candle.y,
      width: candle.width,
      height: candle.height,
      rx: 4,
      fill: candle.fill,
      opacity: 1
    };
  });

  const timeline = candles.map(function (candle, index) {
    return {
      id: candle.id + '-reveal',
      target: candle.id,
      type: 'fade',
      from: { opacity: 0 },
      to: { opacity: 1 },
      duration: 0.55,
      delay: index * (0.1 + (variant * 0.02)),
      ease: 'power2.out',
      repeat: 0,
      yoyo: false
    };
  });

  return createScene(palette.background, elements, timeline);
}

module.exports = buildCandlestick;
