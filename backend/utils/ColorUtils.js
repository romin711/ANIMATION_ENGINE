'use strict';

const { clamp } = require('./MathUtils');

// ─────────────────────────────────────────────────────────────────────────────
// Conversion helpers
// ─────────────────────────────────────────────────────────────────────────────

function hexToRgb(hex) {
  const clean = hex.replace('#', '');
  const full = clean.length === 3
    ? clean.split('').map(c => c + c).join('')
    : clean;
  return {
    r: parseInt(full.slice(0, 2), 16),
    g: parseInt(full.slice(2, 4), 16),
    b: parseInt(full.slice(4, 6), 16)
  };
}

function rgbToHex(r, g, b) {
  return '#' + [r, g, b].map(v => {
    const h = Math.round(clamp(v, 0, 255)).toString(16);
    return h.length === 1 ? '0' + h : h;
  }).join('');
}

function rgbToHsl(r, g, b) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
    }
  }

  return { h: h * 360, s: s * 100, l: l * 100 };
}

function hslToRgb(h, s, l) {
  h /= 360; s /= 100; l /= 100;

  if (s === 0) {
    const v = l * 255;
    return { r: v, g: v, b: v };
  }

  function hue2rgb(p, q, t) {
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  }

  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;

  return {
    r: hue2rgb(p, q, h + 1 / 3) * 255,
    g: hue2rgb(p, q, h) * 255,
    b: hue2rgb(p, q, h - 1 / 3) * 255
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Interpolation — done in HSL space for perceptually smooth transitions
// ─────────────────────────────────────────────────────────────────────────────

function lerpColor(hexA, hexB, t) {
  const rgbA = hexToRgb(hexA);
  const rgbB = hexToRgb(hexB);
  const hslA = rgbToHsl(rgbA.r, rgbA.g, rgbA.b);
  const hslB = rgbToHsl(rgbB.r, rgbB.g, rgbB.b);

  // Handle hue wrap-around (take the shorter arc)
  let dh = hslB.h - hslA.h;
  if (dh > 180)  dh -= 360;
  if (dh < -180) dh += 360;

  const h = hslA.h + dh * t;
  const s = hslA.s + (hslB.s - hslA.s) * t;
  const l = hslA.l + (hslB.l - hslA.l) * t;

  const rgb = hslToRgb(((h % 360) + 360) % 360, s, l);
  return rgbToHex(rgb.r, rgb.g, rgb.b);
}

// ─────────────────────────────────────────────────────────────────────────────
// Palette generators
// ─────────────────────────────────────────────────────────────────────────────

function complementary(hex) {
  const { r, g, b } = hexToRgb(hex);
  const hsl = rgbToHsl(r, g, b);
  const rgb = hslToRgb((hsl.h + 180) % 360, hsl.s, hsl.l);
  return rgbToHex(rgb.r, rgb.g, rgb.b);
}

function triadic(hex) {
  const { r, g, b } = hexToRgb(hex);
  const hsl = rgbToHsl(r, g, b);
  return [0, 120, 240].map(offset => {
    const rgb = hslToRgb((hsl.h + offset) % 360, hsl.s, hsl.l);
    return rgbToHex(rgb.r, rgb.g, rgb.b);
  });
}

function analogous(hex, spread = 30) {
  const { r, g, b } = hexToRgb(hex);
  const hsl = rgbToHsl(r, g, b);
  return [-spread, 0, spread].map(offset => {
    const rgb = hslToRgb((hsl.h + offset + 360) % 360, hsl.s, hsl.l);
    return rgbToHex(rgb.r, rgb.g, rgb.b);
  });
}

// Lighten or darken a hex color by a factor (positive = lighter, negative = darker)
function adjustLightness(hex, amount) {
  const { r, g, b } = hexToRgb(hex);
  const hsl = rgbToHsl(r, g, b);
  const rgb = hslToRgb(hsl.h, hsl.s, clamp(hsl.l + amount, 0, 100));
  return rgbToHex(rgb.r, rgb.g, rgb.b);
}

module.exports = {
  hexToRgb,
  rgbToHex,
  rgbToHsl,
  hslToRgb,
  lerpColor,
  complementary,
  triadic,
  analogous,
  adjustLightness
};