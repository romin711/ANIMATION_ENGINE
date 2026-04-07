'use strict';

const PLAN_VERSION = '1.0';

const PLAN_SCENE_TYPES = [
  'single-object',
  'orbit',
  'chart',
  'text',
  'abstract',
  'multi-object'
];

const PLAN_SUBJECT_TYPES = [
  'square',
  'circle',
  'planet',
  'candlestick',
  'text',
  'custom'
];

const PLAN_MOTION_TYPES = [
  'spin',
  'orbit',
  'fade',
  'bounce',
  'float',
  'pulse',
  'reveal'
];

const PLAN_COMPLEXITY_LEVELS = [
  'basic',
  'medium',
  'rich'
];

const PLAN_MOOD_TYPES = [
  'clean',
  'playful',
  'dramatic',
  'calm',
  'futuristic'
];

const ANIMATION_PLAN_SCHEMA = {
  version: PLAN_VERSION,
  sceneType: 'single-object',
  subject: {
    type: 'circle',
    label: 'Object',
    color: '#3b82f6'
  },
  secondarySubjects: [],
  motion: {
    type: 'float',
    loop: true
  },
  style: {
    complexity: 'basic',
    mood: 'clean'
  }
};

module.exports = {
  ANIMATION_PLAN_SCHEMA,
  PLAN_VERSION,
  PLAN_SCENE_TYPES,
  PLAN_SUBJECT_TYPES,
  PLAN_MOTION_TYPES,
  PLAN_COMPLEXITY_LEVELS,
  PLAN_MOOD_TYPES
};
