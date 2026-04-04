'use strict';

const Vector2D = require('./Vector2D');
const { clamp, round } = require('../utils/MathUtils');

const CANVAS_W = 800;
const CANVAS_H = 450;

// ─────────────────────────────────────────────────────────────────────────────
// Verlet Particle
// Uses position-based Verlet integration which is more stable than Euler
// for bouncing / constrained simulations.
// ─────────────────────────────────────────────────────────────────────────────

class VerletParticle {
  constructor(x, y, vx = 0, vy = 0, mass = 1) {
    this.pos     = new Vector2D(x, y);
    this.prevPos = new Vector2D(x - vx * (1 / 60), y - vy * (1 / 60));
    this.acc     = Vector2D.zero();
    this.mass    = mass;
  }

  applyForce(force) {
    // F = ma  →  a = F/m
    this.acc = this.acc.add(force.scale(1 / this.mass));
  }

  integrate(dt) {
    const vel     = this.pos.sub(this.prevPos);
    const newPos  = this.pos.add(vel).add(this.acc.scale(dt * dt));
    this.prevPos  = this.pos;
    this.pos      = newPos;
    this.acc      = Vector2D.zero();
  }

  velocity(dt) {
    return this.pos.sub(this.prevPos).scale(1 / dt);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Gravity + Bounce
// Simulates a ball thrown upward that falls under gravity and bounces
// off the floor and side walls with energy loss.
// ─────────────────────────────────────────────────────────────────────────────

function simulateGravityBounce(config = {}) {
  const {
    startX      = CANVAS_W / 2,
    startY      = CANVAS_H * 0.2,
    velocityX   = 0,
    velocityY   = -80,
    gravity     = 650,       // px/s²
    friction    = 0.995,     // air resistance per step
    restitution = 0.58,      // energy kept on bounce (0–1)
    duration    = 3.5,
    sampleFPS   = 30,
    canvasWidth  = CANVAS_W,
    canvasHeight = CANVAS_H,
    padding     = 20
  } = config;

  const dt       = 1 / 120;
  const steps    = Math.ceil(duration / dt);
  const interval = Math.max(1, Math.round((1 / sampleFPS) / dt));
  const positions = [];

  const particle = new VerletParticle(startX, startY, velocityX, velocityY);

  for (let i = 0; i < steps; i++) {
    // Gravity force
    particle.applyForce(new Vector2D(0, gravity * particle.mass));

    const vel = particle.velocity(dt);
    // Air resistance (scale velocity back a tiny bit each step)
    particle.prevPos = particle.pos.sub(vel.scale(friction));

    particle.integrate(dt);

    // Floor collision
    if (particle.pos.y >= canvasHeight - padding) {
      particle.pos     = new Vector2D(particle.pos.x, canvasHeight - padding);
      const v          = particle.velocity(dt);
      const newVy      = -v.y * restitution;
      const newVx      = v.x * 0.92; // floor friction
      particle.prevPos = particle.pos.sub(new Vector2D(newVx, newVy).scale(dt));
    }

    // Left/right walls
    if (particle.pos.x <= padding) {
      const v = particle.velocity(dt);
      particle.pos     = new Vector2D(padding, particle.pos.y);
      particle.prevPos = particle.pos.sub(new Vector2D(-v.x * restitution, v.y).scale(dt));
    }
    if (particle.pos.x >= canvasWidth - padding) {
      const v = particle.velocity(dt);
      particle.pos     = new Vector2D(canvasWidth - padding, particle.pos.y);
      particle.prevPos = particle.pos.sub(new Vector2D(-v.x * restitution, v.y).scale(dt));
    }

    if (i % interval === 0) {
      positions.push({ x: round(particle.pos.x, 1), y: round(particle.pos.y, 1) });
    }
  }

  return positions;
}

// ─────────────────────────────────────────────────────────────────────────────
// Spring Oscillation  (Hooke's Law: F = -k·displacement − d·velocity)
// ─────────────────────────────────────────────────────────────────────────────

function simulateSpring(config = {}) {
  const {
    startX, startY,
    restX,  restY,
    stiffness = 200,   // spring constant k
    damping   = 10,    // energy dissipation coefficient
    mass      = 1,
    duration  = 3,
    sampleFPS = 30
  } = config;

  const dt       = 1 / 240;
  const steps    = Math.ceil(duration / dt);
  const interval = Math.max(1, Math.round((1 / sampleFPS) / dt));

  let x  = startX, y  = startY;
  let vx = 0,      vy = 0;
  const positions = [];

  for (let i = 0; i < steps; i++) {
    // Spring force toward rest position
    const fx = -stiffness * (x - restX) - damping * vx;
    const fy = -stiffness * (y - restY) - damping * vy;

    vx += (fx / mass) * dt;
    vy += (fy / mass) * dt;
    x  += vx * dt;
    y  += vy * dt;

    if (i % interval === 0) {
      positions.push({ x: round(x, 1), y: round(y, 1) });
    }
  }

  return positions;
}

// ─────────────────────────────────────────────────────────────────────────────
// Pendulum  (exact nonlinear equation: α = -(g/L)·sin(θ))
// ─────────────────────────────────────────────────────────────────────────────

function simulatePendulum(config = {}) {
  const {
    pivotX,
    pivotY,
    length       = 140,
    startAngle   = Math.PI / 4,   // radians from vertical
    gravity      = 900,
    damping      = 0.998,
    duration     = 4,
    sampleFPS    = 30
  } = config;

  const dt       = 1 / 240;
  const steps    = Math.ceil(duration / dt);
  const interval = Math.max(1, Math.round((1 / sampleFPS) / dt));

  let theta  = startAngle;
  let omega  = 0;   // angular velocity
  const positions = [];

  for (let i = 0; i < steps; i++) {
    // α = -(g/L)·sin(θ)  →  exact pendulum, no small-angle approximation
    const alpha = -(gravity / length) * Math.sin(theta);
    omega       = (omega + alpha * dt) * damping;
    theta      += omega * dt;

    if (i % interval === 0) {
      positions.push({
        x: round(pivotX + length * Math.sin(theta), 1),
        y: round(pivotY + length * Math.cos(theta), 1)
      });
    }
  }

  return positions;
}

// ─────────────────────────────────────────────────────────────────────────────
// Projectile with drag  (realistic arc with air resistance)
// ─────────────────────────────────────────────────────────────────────────────

function simulateProjectile(config = {}) {
  const {
    startX    = 50,
    startY    = CANVAS_H - 50,
    angle     = -55,          // launch angle in degrees (negative = upward)
    speed     = 420,
    gravity   = 500,
    drag      = 0.008,        // quadratic drag coefficient
    duration  = 2.5,
    sampleFPS = 30
  } = config;

  const rad      = angle * Math.PI / 180;
  const dt       = 1 / 120;
  const steps    = Math.ceil(duration / dt);
  const interval = Math.max(1, Math.round((1 / sampleFPS) / dt));

  let x  = startX,           y  = startY;
  let vx = Math.cos(rad) * speed, vy = Math.sin(rad) * speed;
  const positions = [];

  for (let i = 0; i < steps; i++) {
    // Quadratic drag: F_drag = -drag * v² * v̂
    const speedSq  = vx * vx + vy * vy;
    const spd      = Math.sqrt(speedSq);
    if (spd > 0) {
      const dragF  = drag * speedSq;
      vx -= (dragF * (vx / spd)) * dt;
      vy -= (dragF * (vy / spd)) * dt;
    }

    vy += gravity * dt;
    x  += vx * dt;
    y  += vy * dt;

    // Stop at floor
    if (y >= CANVAS_H - 20) { y = CANVAS_H - 20; vy = 0; vx *= 0.5; }

    if (i % interval === 0) {
      positions.push({ x: round(x, 1), y: round(y, 1) });
    }
  }

  return positions;
}

module.exports = {
  simulateGravityBounce,
  simulateSpring,
  simulatePendulum,
  simulateProjectile,
  VerletParticle
};