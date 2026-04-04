'use strict';

const { degToRad, round } = require('../utils/MathUtils');

// ─────────────────────────────────────────────────────────────────────────────
// Circular Orbit
// Uniform circular motion: x = cx + r·cos(θ), y = cy + r·sin(θ)
// ─────────────────────────────────────────────────────────────────────────────

function circularOrbit(config = {}) {
  const {
    centerX,
    centerY,
    radius,
    period     = 3,           // seconds per full revolution
    startAngle = 0,           // degrees
    clockwise  = true,
    sampleFPS  = 30,
    duration                  // defaults to one full period
  } = config;

  const totalTime = duration || period;
  const steps     = Math.ceil(totalTime * sampleFPS);
  const direction = clockwise ? 1 : -1;
  const positions = [];

  for (let i = 0; i <= steps; i++) {
    const t     = i / steps;
    const angle = degToRad(startAngle) + direction * (t * totalTime / period) * Math.PI * 2;
    positions.push({
      x: round(centerX + radius * Math.cos(angle), 1),
      y: round(centerY + radius * Math.sin(angle), 1)
    });
  }

  return positions;
}

// ─────────────────────────────────────────────────────────────────────────────
// Elliptical Orbit
// Parametric ellipse with optional axial tilt.
// Semi-major (a) = half the wide axis, semi-minor (b) = half the narrow axis.
// ─────────────────────────────────────────────────────────────────────────────

function ellipticalOrbit(config = {}) {
  const {
    centerX,
    centerY,
    semiMajor,   // wide radius
    semiMinor,   // narrow radius
    tilt       = 0,     // orbit plane rotation in degrees
    period     = 4,
    startAngle = 0,
    clockwise  = true,
    sampleFPS  = 30,
    duration
  } = config;

  const totalTime = duration || period;
  const steps     = Math.ceil(totalTime * sampleFPS);
  const direction = clockwise ? 1 : -1;
  const tiltRad   = degToRad(tilt);
  const positions = [];

  for (let i = 0; i <= steps; i++) {
    const t     = i / steps;
    const angle = degToRad(startAngle) + direction * (t * totalTime / period) * Math.PI * 2;

    // Ellipse in local frame
    const ex = semiMajor * Math.cos(angle);
    const ey = semiMinor * Math.sin(angle);

    // Rotate by tilt
    const x = centerX + ex * Math.cos(tiltRad) - ey * Math.sin(tiltRad);
    const y = centerY + ex * Math.sin(tiltRad) + ey * Math.cos(tiltRad);

    positions.push({ x: round(x, 1), y: round(y, 1) });
  }

  return positions;
}

// ─────────────────────────────────────────────────────────────────────────────
// Figure-8 Path  (Lemniscate of Bernoulli)
// Great for looping motion that looks organic — a planet-like object
// following a figure-8 instead of a simple circle.
// ─────────────────────────────────────────────────────────────────────────────

function figure8Path(config = {}) {
  const {
    centerX,
    centerY,
    width    = 200,
    height   = 100,
    period   = 4,
    sampleFPS = 30,
    duration
  } = config;

  const totalTime = duration || period;
  const steps     = Math.ceil(totalTime * sampleFPS);
  const positions = [];

  for (let i = 0; i <= steps; i++) {
    const t   = (i / steps) * Math.PI * 2 * (totalTime / period);
    const denom = 1 + Math.sin(t) * Math.sin(t);
    const x   = centerX + (width / 2)  * Math.cos(t) / denom;
    const y   = centerY + (height / 2) * Math.sin(t) * Math.cos(t) / denom;
    positions.push({ x: round(x, 1), y: round(y, 1) });
  }

  return positions;
}

// ─────────────────────────────────────────────────────────────────────────────
// Epicycloid (small circle rolling around larger circle)
// Produces flower/star-like closed paths depending on k ratio.
// k=2: cardioid, k=3: three-petal rose, k=5: five-point star path
// ─────────────────────────────────────────────────────────────────────────────

function epicycloidPath(config = {}) {
  const {
    centerX,
    centerY,
    outerRadius = 100,
    innerRadius = 30,
    period      = 4,
    sampleFPS   = 30,
    duration
  } = config;

  const totalTime = duration || period;
  const steps     = Math.ceil(totalTime * sampleFPS);
  const k         = outerRadius / innerRadius;
  const positions = [];

  for (let i = 0; i <= steps; i++) {
    const t   = (i / steps) * Math.PI * 2 * (totalTime / period);
    const x   = centerX + (outerRadius + innerRadius) * Math.cos(t)
                - innerRadius * Math.cos((k + 1) * t);
    const y   = centerY + (outerRadius + innerRadius) * Math.sin(t)
                - innerRadius * Math.sin((k + 1) * t);
    positions.push({ x: round(x, 1), y: round(y, 1) });
  }

  return positions;
}

module.exports = {
  circularOrbit,
  ellipticalOrbit,
  figure8Path,
  epicycloidPath
};