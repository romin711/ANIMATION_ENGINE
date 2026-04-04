'use strict';

const { analyzeScene, INTENT }                              = require('./SceneAnalyzer');
const { optimizeKeyframes }                                 = require('./KeyframeOptimizer');
const { positionsToKeyframes }                              = require('../physics/MotionSolver');
const { simulateGravityBounce, simulateSpring,
        simulatePendulum, simulateProjectile }              = require('../physics/PhysicsEngine');
const { simulateParticleBurst, simulateFloatingParticles }  = require('../physics/ParticleSystem');
const { circularOrbit, ellipticalOrbit,
        figure8Path, epicycloidPath }                       = require('../physics/OrbitalMechanics');
const { sineWavePath, organicFloatPath,
        spiralPath, lissajousPath, dampedWavePath }         = require('../physics/WaveGenerator');
const { round }                                             = require('../utils/MathUtils');

const CANVAS_W = 800;
const CANVAS_H = 450;

// ─────────────────────────────────────────────────────────────────────────────
// Geometry helpers
// ─────────────────────────────────────────────────────────────────────────────

function elementCenter(el) {
  return { x: el.x || CANVAS_W / 2, y: el.y || CANVAS_H / 2 };
}

// Find the best "parent" for an orbital element — the nearest large circle,
// or canvas center if nothing qualifies.
function findOrbitParent(el, allElements) {
  const candidates = allElements.filter(other =>
    other.id !== el.id &&
    other.type === 'circle' &&
    (other.radius || 0) > (el.radius || 0) * 1.5
  );

  if (candidates.length === 0) return { x: CANVAS_W / 2, y: CANVAS_H / 2 };

  // Closest large circle
  return candidates.reduce((best, other) => {
    const db = Math.hypot(el.x - best.x, el.y - best.y);
    const do_ = Math.hypot(el.x - other.x, el.y - other.y);
    return do_ < db ? other : best;
  }, candidates[0]);
}

function estimateOrbitRadius(el, center) {
  const dist = Math.hypot((el.x || 0) - center.x, (el.y || 0) - center.y);
  return dist > 25 ? round(dist, 1) : 110 + Math.random() * 40;
}

function estimateStartAngleDeg(el, center) {
  return Math.atan2((el.y || 0) - center.y, (el.x || 0) - center.x) * 180 / Math.PI;
}

// ─────────────────────────────────────────────────────────────────────────────
// Physics dispatch
// Returns an array of {x, y} position samples, or null (fall back to from/to).
// ─────────────────────────────────────────────────────────────────────────────

function computePositions(intent, anim, el, allElements) {
  const dur     = anim.duration || 2;
  const center  = findOrbitParent(el, allElements);
  const radius  = estimateOrbitRadius(el, center);
  const start   = estimateStartAngleDeg(el, center);
  const elC     = elementCenter(el);
  const fromX   = (anim.from && anim.from.x != null) ? anim.from.x : elC.x;
  const fromY   = (anim.from && anim.from.y != null) ? anim.from.y : elC.y;
  const toX     = (anim.to   && anim.to.x   != null) ? anim.to.x   : elC.x;
  const toY     = (anim.to   && anim.to.y   != null) ? anim.to.y   : elC.y;

  switch (intent) {

    case INTENT.ORBITAL:
      return circularOrbit({
        centerX:    center.x,
        centerY:    center.y,
        radius,
        startAngle: start,
        period:     dur,
        duration:   dur,
        clockwise:  true,
        sampleFPS:  30
      });

    case INTENT.ELLIPTICAL:
      return ellipticalOrbit({
        centerX:    center.x,
        centerY:    center.y,
        semiMajor:  radius * 1.35,
        semiMinor:  radius * 0.65,
        tilt:       Math.random() * 30 - 15,
        startAngle: start,
        period:     dur,
        duration:   dur,
        sampleFPS:  30
      });

    case INTENT.GRAVITY:
      return simulateGravityBounce({
        startX:      fromX,
        startY:      Math.min(fromY, CANVAS_H * 0.25),
        velocityX:   (Math.random() - 0.5) * 80,
        velocityY:   -60,
        gravity:     620,
        friction:    0.997,
        restitution: 0.54,
        duration:    dur,
        canvasWidth:  CANVAS_W,
        canvasHeight: CANVAS_H,
        sampleFPS:   30
      });

    case INTENT.SPRING:
      return simulateSpring({
        startX: fromX,
        startY: fromY,
        restX:  toX,
        restY:  toY,
        stiffness: 160 + Math.random() * 80,
        damping:   7  + Math.random() * 6,
        mass:      1,
        duration:  dur,
        sampleFPS: 30
      });

    case INTENT.PENDULUM:
      return simulatePendulum({
        pivotX:     elC.x,
        pivotY:     Math.max(15, elC.y - 160),
        length:     120 + Math.random() * 60,
        startAngle: (Math.random() > 0.5 ? 1 : -1) * (Math.PI / 6 + Math.random() * Math.PI / 12),
        gravity:    850,
        damping:    0.9985,
        duration:   dur,
        sampleFPS:  30
      });

    case INTENT.PROJECTILE:
      return simulateProjectile({
        startX:    fromX,
        startY:    fromY,
        angle:     -50 + Math.random() * 20,
        speed:     380 + Math.random() * 80,
        gravity:   480,
        drag:      0.007,
        duration:  dur,
        sampleFPS: 30
      });

    case INTENT.FLOAT:
      return organicFloatPath({
        startX:    elC.x,
        startY:    elC.y,
        rangeX:    45 + Math.random() * 55,
        rangeY:    30 + Math.random() * 40,
        duration:  dur,
        sampleFPS: 22,
        seed:      Math.floor(Math.random() * 9999)
      });

    case INTENT.WAVE:
      return sineWavePath({
        startX:         fromX,
        startY:         fromY,
        amplitude:      55 + Math.random() * 45,
        frequency:      1 + Math.random(),
        travelDistance: toX - fromX || 500,
        duration:       dur,
        sampleFPS:      30
      });

    case INTENT.SPIRAL:
      return spiralPath({
        centerX:     elC.x,
        centerY:     elC.y,
        startRadius: 5,
        endRadius:   radius,
        revolutions: 1.5 + Math.random() * 1.5,
        duration:    dur,
        sampleFPS:   30
      });

    case INTENT.LISSAJOUS:
      return lissajousPath({
        centerX:   elC.x,
        centerY:   elC.y,
        width:     150 + Math.random() * 100,
        height:    90  + Math.random() * 70,
        freqA:     [2, 3, 3, 4, 5][Math.floor(Math.random() * 5)],
        freqB:     [1, 2, 3, 2, 4][Math.floor(Math.random() * 5)],
        phase:     Math.PI / 2,
        duration:  dur,
        sampleFPS: 30
      });

    case INTENT.FIGURE8:
      return figure8Path({
        centerX:   elC.x,
        centerY:   elC.y,
        width:     190 + Math.random() * 80,
        height:    85  + Math.random() * 45,
        period:    dur,
        duration:  dur,
        sampleFPS: 30
      });

    case INTENT.EPICYCLOID:
      return epicycloidPath({
        centerX:     elC.x,
        centerY:     elC.y,
        outerRadius: 80 + Math.random() * 40,
        innerRadius: 20 + Math.random() * 25,
        period:      dur,
        duration:    dur,
        sampleFPS:   30
      });

    case INTENT.DAMPED:
      return dampedWavePath({
        startX:    elC.x,
        startY:    elC.y,
        amplitude: 90 + Math.random() * 50,
        frequency: 3  + Math.random() * 2,
        decayRate: 2  + Math.random() * 2,
        axis:      Math.random() > 0.5 ? 'x' : 'y',
        duration:  dur,
        sampleFPS: 30
      });

    default:
      return null;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Main enrichment function
// ─────────────────────────────────────────────────────────────────────────────

function enrichAnimation(animationJSON) {
  if (!animationJSON || !animationJSON.elements || !animationJSON.timeline) {
    return animationJSON;
  }

  const { animationIntents } = analyzeScene(animationJSON);

  const elementMap = {};
  (animationJSON.elements || []).forEach(el => { elementMap[el.id] = el; });

  const enrichedTimeline = animationJSON.timeline.map(anim => {
    const intent  = animationIntents[anim.id] || INTENT.STANDARD;
    const element = elementMap[anim.target];

    // Only apply physics to move animations — non-move (fade/scale/rotate/color/blur)
    // are handled perfectly well by GSAP's from/to without physics.
    if (!element || intent === INTENT.STANDARD || anim.type !== 'move') {
      return anim;
    }

    try {
      const positions = computePositions(intent, anim, element, animationJSON.elements);
      if (!positions || positions.length < 3) return anim;

      const keyframes  = positionsToKeyframes(positions);
      const optimized  = optimizeKeyframes(keyframes, 'move');

      return Object.assign({}, anim, {
        keyframes:      optimized,
        _physicsIntent: intent
        // from/to kept as fallback for frontends that don't support keyframes yet
      });
    } catch (_err) {
      // Physics simulation failed — return original unchanged
      return anim;
    }
  });

  return Object.assign({}, animationJSON, { timeline: enrichedTimeline });
}

module.exports = { enrichAnimation };