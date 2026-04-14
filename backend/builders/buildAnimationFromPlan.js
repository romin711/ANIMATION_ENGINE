'use strict';

const buildBasicShape = require('./templates/basicShapeBuilder');
const buildAbstractScene = require('./templates/abstractSceneBuilder');
const buildCandlestick = require('./templates/candlestickBuilder');
const buildOrbit = require('./templates/orbitBuilder');
const buildText = require('./templates/textBuilder');
const buildBounceScene = require('./templates/bounceSceneBuilder');
const buildFloatScene = require('./templates/floatSceneBuilder');
const buildParticleExplosion = require('./templates/particleExplosionBuilder');
const buildParticleFlowField = require('./templates/particleFlowFieldBuilder');
const buildMultiSubjectScene = require('./templates/multiSubjectSceneBuilder');
const buildSkylineScene = require('./templates/skylineSceneBuilder');
const buildAdvancedChartScene = require('./templates/advancedChartSceneBuilder');
const builderUtils = require('./builderUtils');
const MotionSolver = require('../physics/MotionSolver');
const ParticleSystem = require('../physics/ParticleSystem');
const PhysicsEngine = require('../physics/PhysicsEngine');
const OrbitalMechanics = require('../physics/OrbitalMechanics');
const WaveGenerator = require('../physics/WaveGenerator');
const { validateAnimationPlan } = require('../validators/animationPlanValidator');
const { logBuilder } = require('../utils/metrics');

const BUILDER_MAP = {
  basic_shape: { builder: buildBasicShape, name: 'basicShapeBuilder' },
  orbit: { builder: buildOrbit, name: 'orbitBuilder' },
  candlestick: { builder: buildCandlestick, name: 'candlestickBuilder' },
  text: { builder: buildText, name: 'textBuilder' },
  bounce: { builder: buildBounceScene, name: 'bounceSceneBuilder' },
  float: { builder: buildFloatScene, name: 'floatSceneBuilder' },
  particles: { builder: buildParticleExplosion, name: 'particleExplosionBuilder' },
  flow: { builder: buildParticleFlowField, name: 'particleFlowFieldBuilder' },
  multi: { builder: buildMultiSubjectScene, name: 'multiSubjectSceneBuilder' },
  skyline: { builder: buildSkylineScene, name: 'skylineSceneBuilder' },
  chart_advanced: { builder: buildAdvancedChartScene, name: 'advancedChartSceneBuilder' },
  unknown: { builder: buildAbstractScene, name: 'abstractSceneBuilder' }
};

const PHYSICS_MODULES = {
  MotionSolver,
  ParticleSystem,
  PhysicsEngine,
  OrbitalMechanics,
  WaveGenerator
};

function selectBuilder(plan) {
  const planType = plan?.type;

  if (!planType) {
    const err = new Error('plan.type is required for builder selection');
    err.statusCode = 400;
    throw err;
  }

  if (planType === 'unknown') {
    return BUILDER_MAP.unknown;
  }

  if (!Object.prototype.hasOwnProperty.call(BUILDER_MAP, planType)) {
    const err = new Error(
      'Unknown plan.type: "' + planType + '". Supported types: ' + Object.keys(BUILDER_MAP).filter(function (key) {
        return key !== 'unknown';
      }).join(', ')
    );
    err.statusCode = 400;
    throw err;
  }

  return BUILDER_MAP[planType];
}

function buildAnimationFromPlan(plan, prompt) {
  const validation = validateAnimationPlan(plan);
  if (!validation.valid) {
    const err = new Error('Animation plan failed validation: ' + validation.errors.join(' | '));
    err.statusCode = 500;
    throw err;
  }

  console.log('PLAN_TYPE:', plan.type);

  const { builder, name: builderName } = selectBuilder(plan);

  if (plan.type === 'unknown') {
    console.warn('FALLBACK_USED', plan.prompt || prompt);
  }

  console.log('BUILDER_SELECTED:', builderName);
  logBuilder(builderName);

  return builder(plan, PHYSICS_MODULES, builderUtils);
}

module.exports = {
  BUILDER_MAP,
  buildAnimationFromPlan,
  selectBuilder
};
