'use strict';

const { createRNG, round } = require('../utils/MathUtils');

// ─────────────────────────────────────────────────────────────────────────────
// Sine Wave Path
// Element travels across the canvas while oscillating perpendicular.
// ─────────────────────────────────────────────────────────────────────────────

function sineWavePath(config = {}) {
  const {
    startX,
    startY,
    amplitude      = 65,
    frequency      = 1,      // full cycles across travel
    travelDistance = 700,
    direction      = 1,      // 1 = left→right, -1 = right→left
    horizontal     = true,   // true = x-travel, false = y-travel
    duration       = 3,
    sampleFPS      = 30
  } = config;

  const steps     = Math.ceil(duration * sampleFPS);
  const positions = [];

  for (let i = 0; i <= steps; i++) {
    const t    = i / steps;
    const dist = t * travelDistance * direction;
    const wave = amplitude * Math.sin(t * frequency * Math.PI * 2);

    positions.push(horizontal
      ? { x: round(startX + dist, 1), y: round(startY + wave, 1) }
      : { x: round(startX + wave, 1), y: round(startY + dist, 1) }
    );
  }

  return positions;
}

// ─────────────────────────────────────────────────────────────────────────────
// Organic Float Path — layered harmonic noise
// Sums multiple sine octaves with random frequencies and phases
// to produce smooth, non-repeating floating movement.
// (Fake Perlin — no external deps needed.)
// ─────────────────────────────────────────────────────────────────────────────

function organicFloatPath(config = {}) {
  const {
    startX   = 400,
    startY   = 225,
    rangeX   = 80,
    rangeY   = 55,
    duration = 4,
    sampleFPS = 24,
    seed     = 1
  } = config;

  const rng       = createRNG(seed);
  const steps     = Math.ceil(duration * sampleFPS);
  const positions = [];

  // Build 4 random octaves for each axis
  const buildOctaves = () => Array.from({ length: 4 }, (_, i) => ({
    freq:  (i + 1) * (0.4 + rng() * 1.6),
    amp:   1 / (i + 1),
    phase: rng() * Math.PI * 2
  }));

  const octX = buildOctaves();
  const octY = buildOctaves();

  const totalAmpX = octX.reduce((s, o) => s + o.amp, 0);
  const totalAmpY = octY.reduce((s, o) => s + o.amp, 0);

  for (let i = 0; i <= steps; i++) {
    const t  = (i / steps) * Math.PI * 2;
    const nx = octX.reduce((s, o) => s + Math.sin(t * o.freq + o.phase) * o.amp, 0) / totalAmpX;
    const ny = octY.reduce((s, o) => s + Math.sin(t * o.freq + o.phase) * o.amp, 0) / totalAmpY;

    positions.push({
      x: round(startX + nx * rangeX, 1),
      y: round(startY + ny * rangeY, 1)
    });
  }

  return positions;
}

// ─────────────────────────────────────────────────────────────────────────────
// Spiral Path — expands outward from center (or inward to center)
// ─────────────────────────────────────────────────────────────────────────────

function spiralPath(config = {}) {
  const {
    centerX,
    centerY,
    startRadius  = 0,
    endRadius    = 150,
    revolutions  = 2,
    duration     = 3,
    sampleFPS    = 30
  } = config;

  const steps     = Math.ceil(duration * sampleFPS);
  const positions = [];

  for (let i = 0; i <= steps; i++) {
    const t     = i / steps;
    const angle = t * revolutions * Math.PI * 2;
    const r     = startRadius + (endRadius - startRadius) * t;
    positions.push({
      x: round(centerX + r * Math.cos(angle), 1),
      y: round(centerY + r * Math.sin(angle), 1)
    });
  }

  return positions;
}

// ─────────────────────────────────────────────────────────────────────────────
// Lissajous Curve
// x = A·sin(a·t + δ),  y = B·sin(b·t)
// Different frequency ratios produce different knot patterns.
//   a:b = 1:1 → diagonal line/ellipse
//   a:b = 2:1 → parabola/figure-8
//   a:b = 3:2 → pretzel
//   a:b = 5:4 → complex star knot
// ─────────────────────────────────────────────────────────────────────────────

function lissajousPath(config = {}) {
  const {
    centerX,
    centerY,
    width     = 200,
    height    = 140,
    freqA     = 3,          // x-axis frequency
    freqB     = 2,          // y-axis frequency
    phase     = Math.PI / 2,
    duration  = 4,
    sampleFPS = 30
  } = config;

  const steps     = Math.ceil(duration * sampleFPS);
  const positions = [];

  for (let i = 0; i <= steps; i++) {
    const t = (i / steps) * Math.PI * 2;
    positions.push({
      x: round(centerX + (width  / 2) * Math.sin(freqA * t + phase), 1),
      y: round(centerY + (height / 2) * Math.sin(freqB * t),         1)
    });
  }

  return positions;
}

// ─────────────────────────────────────────────────────────────────────────────
// Damped Wave — oscillation that decays over time (like a plucked string)
// ─────────────────────────────────────────────────────────────────────────────

function dampedWavePath(config = {}) {
  const {
    startX,
    startY,
    amplitude = 100,
    frequency = 3,        // oscillations per duration
    decayRate = 2.5,      // higher = faster decay
    axis      = 'x',      // which axis oscillates
    duration  = 3,
    sampleFPS = 30
  } = config;

  const steps     = Math.ceil(duration * sampleFPS);
  const positions = [];

  for (let i = 0; i <= steps; i++) {
    const t      = i / steps;
    const decay  = Math.exp(-decayRate * t);
    const wave   = amplitude * decay * Math.sin(t * frequency * Math.PI * 2);

    positions.push({
      x: round(startX + (axis === 'x' ? wave : 0), 1),
      y: round(startY + (axis === 'y' ? wave : 0), 1)
    });
  }

  return positions;
}

module.exports = {
  sineWavePath,
  organicFloatPath,
  spiralPath,
  lissajousPath,
  dampedWavePath
};