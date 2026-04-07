'use strict';

const buildBasicShape = require('./templates/basicShapeBuilder');
const buildAbstractScene = require('./templates/abstractSceneBuilder');
const buildCandlestick = require('./templates/candlestickBuilder');
const buildOrbit = require('./templates/orbitBuilder');
const buildText = require('./templates/textBuilder');
const { validateAnimationPlan } = require('../validators/animationPlanValidator');

const BUILDERS = {
  abstract: buildAbstractScene,
  'basic-shape': buildBasicShape,
  candlestick: buildCandlestick,
  orbit: buildOrbit,
  text: buildText
};

function selectBuilderKey(plan, preferredTemplate) {
  if (preferredTemplate && BUILDERS[preferredTemplate]) {
    return preferredTemplate;
  }

  if (plan?.sceneType === 'orbit') return 'orbit';
  if (plan?.sceneType === 'chart' || plan?.subject?.type === 'candlestick') return 'candlestick';
  if (plan?.sceneType === 'text' || plan?.subject?.type === 'text') return 'text';
  if (plan?.sceneType === 'multi-object' || plan?.sceneType === 'abstract') return 'abstract';
  return 'basic-shape';
}

function buildAnimationFromPlan(plan, prompt, options) {
  const validation = validateAnimationPlan(plan);
  if (!validation.valid) {
    const err = new Error('Animation plan failed validation: ' + validation.errors.join(' | '));
    err.statusCode = 500;
    throw err;
  }

  const builderKey = selectBuilderKey(plan, options && options.template);
  return BUILDERS[builderKey](plan, prompt);
}

module.exports = {
  buildAnimationFromPlan,
  selectBuilderKey
};
