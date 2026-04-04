'use strict';

const Vector2D = require('./Vector2D');
const { createRNG, round } = require('../utils/MathUtils');

const CANVAS_W = 800;
const CANVAS_H = 450;

// ─────────────────────────────────────────────────────────────────────────────
// Burst — particles explode from a point with random velocities.
// Each particle has its own position history + opacity/scale over lifetime.
// ─────────────────────────────────────────────────────────────────────────────

function simulateParticleBurst(config = {}) {
  const {
    emitterX    = CANVAS_W / 2,
    emitterY    = CANVAS_H / 2,
    count       = 8,
    speed       = 220,
    spreadAngle = Math.PI * 2,   // full 360° by default
    baseAngle   = -Math.PI / 2,  // emit upward
    gravity     = 280,
    friction    = 0.97,
    duration    = 2.5,
    sampleFPS   = 24,
    seed        = 42
  } = config;

  const rng      = createRNG(seed);
  const dt       = 1 / 60;
  const steps    = Math.ceil(duration / dt);
  const interval = Math.max(1, Math.round((1 / sampleFPS) / dt));

  const particles = Array.from({ length: count }, (_, i) => {
    // Distribute evenly around the spread arc, with slight randomization
    const baseDir = baseAngle + (spreadAngle / count) * i;
    const angle   = baseDir + (rng() - 0.5) * (spreadAngle / count) * 0.5;
    const spd     = speed * (0.65 + rng() * 0.7);
    const life    = 0.55 + rng() * 0.45;  // lifetime fraction (0–1 of duration)

    return {
      x:    emitterX + (rng() - 0.5) * 8,
      y:    emitterY + (rng() - 0.5) * 8,
      vx:   Math.cos(angle) * spd,
      vy:   Math.sin(angle) * spd,
      life,
      history: []
    };
  });

  for (let step = 0; step < steps; step++) {
    const tNorm = (step * dt) / duration;

    particles.forEach(p => {
      // Gravity
      p.vy += gravity * dt;

      // Air friction
      p.vx *= friction;
      p.vy *= friction;

      p.x += p.vx * dt;
      p.y += p.vy * dt;

      if (step % interval === 0) {
        const age     = tNorm / p.life;
        const opacity = round(Math.max(0, 1 - Math.pow(clampLocal(age, 0, 1), 1.8)), 3);
        const scale   = round(Math.max(0.02, 1 - clampLocal(age, 0, 1) * 0.75), 3);

        p.history.push({
          x:       round(p.x, 1),
          y:       round(p.y, 1),
          opacity,
          scale
        });
      }
    });
  }

  return particles.map(p => p.history);
}

// ─────────────────────────────────────────────────────────────────────────────
// Floating — ambient particles drifting upward with organic wobble.
// Used for backgrounds (stars, dust, embers, bubbles).
// ─────────────────────────────────────────────────────────────────────────────

function simulateFloatingParticles(config = {}) {
  const {
    canvasWidth  = CANVAS_W,
    canvasHeight = CANVAS_H,
    count        = 6,
    duration     = 5,
    sampleFPS    = 20,
    seed         = 77
  } = config;

  const rng      = createRNG(seed);
  const dt       = 1 / 30;
  const steps    = Math.ceil(duration / dt);
  const interval = Math.max(1, Math.round((1 / sampleFPS) / dt));

  const particles = Array.from({ length: count }, () => ({
    x:           rng() * canvasWidth,
    y:           canvasHeight * 0.3 + rng() * canvasHeight * 0.7,
    vx:          (rng() - 0.5) * 20,
    vy:          -(8 + rng() * 25),   // drift upward
    wobble:      rng() * Math.PI * 2,
    wobbleSpeed: 0.8 + rng() * 2.0,
    wobbleAmp:   12 + rng() * 28,
    history:     []
  }));

  for (let step = 0; step < steps; step++) {
    const t = step * dt;

    particles.forEach(p => {
      const wobbleX = Math.sin(t * p.wobbleSpeed + p.wobble) * p.wobbleAmp * dt;
      p.x += p.vx * dt + wobbleX;
      p.y += p.vy * dt;

      // Wrap around canvas boundaries
      if (p.y < -20)                p.y = canvasHeight + 20;
      if (p.x < -20)                p.x = canvasWidth + 20;
      if (p.x > canvasWidth + 20)   p.x = -20;

      if (step % interval === 0) {
        p.history.push({ x: round(p.x, 1), y: round(p.y, 1) });
      }
    });
  }

  return particles.map(p => p.history);
}

// ─────────────────────────────────────────────────────────────────────────────
// Rain — particles fall from the top with slight horizontal drift
// ─────────────────────────────────────────────────────────────────────────────

function simulateRain(config = {}) {
  const {
    canvasWidth  = CANVAS_W,
    canvasHeight = CANVAS_H,
    count        = 8,
    speed        = 350,
    angle        = 15,    // degrees from vertical
    duration     = 3,
    sampleFPS    = 24,
    seed         = 33
  } = config;

  const rng      = createRNG(seed);
  const rad      = angle * Math.PI / 180;
  const dt       = 1 / 60;
  const steps    = Math.ceil(duration / dt);
  const interval = Math.max(1, Math.round((1 / sampleFPS) / dt));

  const particles = Array.from({ length: count }, () => ({
    x:       rng() * canvasWidth,
    y:       -(rng() * canvasHeight * 0.5),  // start above canvas
    vx:      Math.sin(rad) * speed * (0.8 + rng() * 0.4),
    vy:      Math.cos(rad) * speed * (0.8 + rng() * 0.4),
    history: []
  }));

  for (let step = 0; step < steps; step++) {
    particles.forEach(p => {
      p.x += p.vx * dt;
      p.y += p.vy * dt;

      // Reset to top when off screen
      if (p.y > canvasHeight + 10) {
        p.y = -(rng() * 50);
        p.x = rng() * canvasWidth;
      }

      if (step % interval === 0) {
        p.history.push({ x: round(p.x, 1), y: round(p.y, 1) });
      }
    });
  }

  return particles.map(p => p.history);
}

function clampLocal(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

module.exports = {
  simulateParticleBurst,
  simulateFloatingParticles,
  simulateRain
};