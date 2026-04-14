'use strict';

const { detectHexColor } = require('../../processors/PromptClassifier');
const { createScene, getVariantFromPrompt, clamp, createPromptHash, lerp } = require('../builderUtils');

function getParticleConfig(variant) {
  const configs = [
    {
      name: 'circular',
      speed: 220,
      spreadAngle: Math.PI * 2,
      baseAngle: -Math.PI / 2,
      gravity: 180,
      friction: 0.965,
      duration: 1.8
    },
    {
      name: 'directional',
      speed: 260,
      spreadAngle: Math.PI / 3,
      baseAngle: -Math.PI / 3,
      gravity: 120,
      friction: 0.97,
      duration: 1.6
    },
    {
      name: 'spiral',
      speed: 240,
      spreadAngle: Math.PI * 2,
      baseAngle: -Math.PI / 2,
      gravity: 150,
      friction: 0.962,
      duration: 1.9,
      spiralOffset: 0.65
    }
  ];

  return configs[variant] || configs[0];
}

function buildParticleExplosion(plan, physicsModules, utils) {
  console.log('BUILDER_USED:', 'particleExplosionBuilder');

  const ParticleSystem = physicsModules && physicsModules.ParticleSystem ? physicsModules.ParticleSystem : require('../../physics/ParticleSystem');
  const variant = utils.getVariantFromPrompt(plan?.prompt || '');
  const config = getParticleConfig(variant);
  const particleCount = clamp(plan?.config?.particleCount || 24, 12, 48);
  const background = plan?.canvas?.background || '#0f172a';
  const fill = plan?.subject?.color || detectHexColor(plan?.prompt, '#ff6b35');
  const seed = createPromptHash(plan?.prompt || '') + (variant * 97);

  const histories = ParticleSystem.simulateParticleBurst({
    emitterX: plan?.position?.x || 400,
    emitterY: plan?.position?.y || 225,
    count: particleCount,
    speed: config.speed,
    spreadAngle: config.spreadAngle,
    baseAngle: config.baseAngle,
    gravity: config.gravity,
    friction: config.friction,
    duration: config.duration,
    sampleFPS: 24,
    seed
  });

  const elements = histories.map(function (history, index) {
    const start = history[0] || { x: 400, y: 225 };
    return {
      id: 'cluster-dot-' + index,
      type: 'circle',
      x: start.x,
      y: start.y,
      radius: clamp(Math.round(lerp(8, 3, particleCount > 1 ? index / (particleCount - 1) : 0)), 2, 10),
      fill,
      opacity: 1
    };
  });

  const timeline = histories.flatMap(function (history, index) {
    const start = history[0] || { x: 400, y: 225 };
    const end = history[history.length - 1] || start;
    const delay = roundTo(index * 0.015, 3);

    return [{
      id: 'cluster-path-' + index,
      target: 'cluster-dot-' + index,
      type: 'move',
      from: { x: start.x, y: start.y },
      to: { x: end.x, y: end.y },
      duration: config.duration,
      delay,
      ease: 'power1.out',
      repeat: 0,
      yoyo: false
    }, {
      id: 'cluster-fade-' + index,
      target: 'cluster-dot-' + index,
      type: 'fade',
      from: { opacity: 1 },
      to: { opacity: 0 },
      duration: config.duration,
      delay,
      ease: 'power2.in',
      repeat: 0,
      yoyo: false
    }];
  });

  const scene = createScene(background, elements, timeline);
  scene.meta = {
    variant: config.name,
    variantIndex: variant,
    particleCount,
    physics: 'ParticleSystem'
  };

  return scene;
}

function roundTo(value, decimals) {
  const factor = Math.pow(10, decimals);
  return Math.round(value * factor) / factor;
}

module.exports = buildParticleExplosion;
