'use strict';

const { createScene, pickVariant } = require('../builderUtils');

function buildCandlestick() {
  const palette = pickVariant('candlestick', [
    { background: '#0b1220', up: '#22c55e', down: '#ef4444' },
    { background: '#0f172a', up: '#10b981', down: '#f87171' }
  ]);

  const candles = [
    { id: 'candle-bull-1', x: 190, y: 190, width: 34, height: 82, fill: palette.up },
    { id: 'candle-bear-2', x: 300, y: 160, width: 34, height: 112, fill: palette.down },
    { id: 'candle-bull-3', x: 410, y: 178, width: 34, height: 94, fill: palette.up },
    { id: 'candle-bear-4', x: 520, y: 145, width: 34, height: 127, fill: palette.down }
  ];

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
      id: candle.id + '-fade',
      target: candle.id,
      type: 'fade',
      from: { opacity: 0 },
      to: { opacity: 1 },
      duration: 0.55,
      delay: index * 0.12,
      ease: 'power2.out',
      repeat: 0,
      yoyo: false
    };
  });

  return createScene(palette.background, elements, timeline);
}

module.exports = buildCandlestick;
