'use strict';

const { analyzeScene, INTENT }                              = require('./SceneAnalyzer');
const { optimizeKeyframes }                                 = require('./KeyframeOptimizer');
const { positionsToKeyframes, buildParticleTimelineEntries } = require('../physics/MotionSolver');
const { simulateGravityBounce, simulateSpring,
        simulatePendulum, simulateProjectile }              = require('../physics/PhysicsEngine');
const { simulateParticleBurst }                             = require('../physics/ParticleSystem');
const { circularOrbit, ellipticalOrbit,
        figure8Path, epicycloidPath }                       = require('../physics/OrbitalMechanics');
const { sineWavePath, organicFloatPath,
        spiralPath, lissajousPath, dampedWavePath }         = require('../physics/WaveGenerator');
const { round }                                             = require('../utils/MathUtils');

const CANVAS_W = 800;
const CANVAS_H = 450;
const PARTICLE_COUNT = 6;
const PARTICLE_SIZE_PATTERN = [0.4, 0.55, 0.7, 0.5, 0.65, 0.45];

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

function createStableSeed(input) {
  let hash = 0;
  const str = String(input || '');

  for (let i = 0; i < str.length; i++) {
    hash = (hash * 31 + str.charCodeAt(i)) >>> 0;
  }

  return hash || 1;
}

function pickParticleSize(index) {
  return PARTICLE_SIZE_PATTERN[index % PARTICLE_SIZE_PATTERN.length];
}

function cloneParticleElement(templateEl, particleId, firstFrame, index) {
  const sizeScale = pickParticleSize(index);
  const clone = Object.assign({}, templateEl, {
    id: particleId,
    x: firstFrame.x,
    y: firstFrame.y,
    opacity: firstFrame.opacity !== undefined ? firstFrame.opacity : (templateEl.opacity ?? 1)
  });

  if (clone.type === 'circle') {
    clone.radius = round(Math.max(2, (templateEl.radius || 10) * sizeScale), 1);
  } else if (clone.type === 'rect') {
    clone.width = round(Math.max(4, (templateEl.width || 20) * sizeScale), 1);
    clone.height = round(Math.max(4, (templateEl.height || 20) * sizeScale), 1);
    if (clone.rx !== undefined) clone.rx = round(clone.rx * sizeScale, 1);
  } else if (clone.type === 'text') {
    clone.fontSize = round(Math.max(10, (templateEl.fontSize || 24) * sizeScale), 1);
  }

  return clone;
}

function addMoveFallback(anim, keyframes) {
  const first = keyframes[0];
  const last  = keyframes[keyframes.length - 1];

  return Object.assign({}, anim, {
    from: Object.assign({}, anim.from, { x: first.x, y: first.y }),
    to:   Object.assign({}, anim.to,   { x: last.x,  y: last.y })
  });
}

function createParticleScaleAnimation(baseAnim, particleId, history, index) {
  const first = history[0];
  const last  = history[history.length - 1];

  return {
    id:       baseAnim.id + '-p' + index + '-scale',
    target:   particleId,
    type:     'scale',
    from:     { scaleX: first.scale ?? 1, scaleY: first.scale ?? 1 },
    to:       { scaleX: last.scale ?? 1,  scaleY: last.scale ?? 1 },
    duration: baseAnim.duration,
    delay:    baseAnim.delay || 0,
    ease:     'power1.out',
    repeat:   0,
    yoyo:     false
  };
}

function createParticleFadeAnimation(baseAnim, particleId, history, index, templateOpacity) {
  const first = history[0];
  const last  = history[history.length - 1];

  return {
    id:       baseAnim.id + '-p' + index + '-fade',
    target:   particleId,
    type:     'fade',
    from:     { opacity: first.opacity ?? templateOpacity ?? 1 },
    to:       { opacity: last.opacity ?? 0 },
    duration: baseAnim.duration,
    delay:    baseAnim.delay || 0,
    ease:     'power1.out',
    repeat:   0,
    yoyo:     false
  };
}

function expandParticleAnimation(anim, el) {
  const emitterX = (anim.from && anim.from.x != null) ? anim.from.x : el.x;
  const emitterY = (anim.from && anim.from.y != null) ? anim.from.y : el.y;
  const seed = createStableSeed(anim.id + ':' + el.id);

  const histories = simulateParticleBurst({
    emitterX,
    emitterY,
    count:     PARTICLE_COUNT,
    duration:  anim.duration || 2,
    sampleFPS: 24,
    seed
  }).filter(history => history.length >= 2);

  if (histories.length === 0) return null;

  const particleIds = histories.map((_, index) => el.id + '__' + anim.id + '__p' + (index + 1));
  const particleElements = histories.map((history, index) =>
    cloneParticleElement(el, particleIds[index], history[0], index)
  );

  const moveEntries = buildParticleTimelineEntries(anim, particleIds, histories).map((entry, index) => {
    const optimized = optimizeKeyframes(entry.keyframes, 'move');
    return Object.assign(
      addMoveFallback(entry, optimized),
      {
        keyframes: optimized,
        ease: anim.ease || 'power2.out'
      }
    );
  });

  const fadeEntries = histories.map((history, index) =>
    createParticleFadeAnimation(anim, particleIds[index], history, index, el.opacity)
  );

  const scaleEntries = histories.map((history, index) =>
    createParticleScaleAnimation(anim, particleIds[index], history, index)
  );

  return {
    elements: particleElements,
    timeline: moveEntries.concat(fadeEntries, scaleEntries)
  };
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

  const enrichedElements = [].concat(animationJSON.elements || []);
  const enrichedTimeline = [];

  (animationJSON.timeline || []).forEach(anim => {
    const intent  = animationIntents[anim.id] || INTENT.STANDARD;
    const element = elementMap[anim.target];

    // Only apply physics to move animations — non-move (fade/scale/rotate/color/blur)
    // are handled perfectly well by GSAP's from/to without physics.
    if (!element || intent === INTENT.STANDARD || anim.type !== 'move') {
      enrichedTimeline.push(anim);
      return;
    }

    if (intent === INTENT.PARTICLE) {
      const expansion = expandParticleAnimation(anim, element);
      if (!expansion) {
        enrichedTimeline.push(anim);
        return;
      }

      enrichedElements.push.apply(enrichedElements, expansion.elements);
      enrichedTimeline.push.apply(enrichedTimeline, expansion.timeline);
      return;
    }

    try {
      const positions = computePositions(intent, anim, element, animationJSON.elements);
      if (!positions || positions.length < 3) {
        enrichedTimeline.push(anim);
        return;
      }

      const keyframes  = positionsToKeyframes(positions);
      const optimized  = optimizeKeyframes(keyframes, 'move');

      enrichedTimeline.push(Object.assign({}, anim, {
        keyframes:      optimized,
        _physicsIntent: intent
        // from/to kept as fallback for frontends that don't support keyframes yet
      }));
    } catch (_err) {
      // Physics simulation failed — return original unchanged
      enrichedTimeline.push(anim);
    }
  });

  return Object.assign({}, animationJSON, {
    elements: enrichedElements,
    timeline: enrichedTimeline
  });
}

module.exports = { enrichAnimation };
