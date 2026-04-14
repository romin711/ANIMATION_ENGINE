'use strict';

const {
  PLAN_VERSION,
  PLAN_SCENE_TYPES,
  PLAN_SUBJECT_TYPES,
  PLAN_MOTION_TYPES,
  PLAN_COMPLEXITY_LEVELS,
  PLAN_MOOD_TYPES
} = require('../schema/animationPlanSchema');

const HEX_RE = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

function isObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function isNonEmptyString(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

function isHex(value) {
  return typeof value === 'string' && HEX_RE.test(value);
}

function validateSubject(subject, path, errors) {
  if (!isObject(subject)) {
    errors.push(path + ' must be an object.');
    return;
  }

  if (!PLAN_SUBJECT_TYPES.includes(subject.type)) {
    errors.push(path + '.type must be one of: ' + PLAN_SUBJECT_TYPES.join(', ') + '.');
  }

  if (!isNonEmptyString(subject.label)) {
    errors.push(path + '.label must be a non-empty string.');
  }

  if (subject.color !== undefined && !isHex(subject.color)) {
    errors.push(path + '.color must be a hex color when provided.');
  }
}

function validateAnimationPlan(plan) {
  const errors = [];

  if (!isObject(plan)) {
    errors.push('Animation plan must be a JSON object.');
    return { valid: false, errors };
  }

  if (plan.version !== PLAN_VERSION) {
    errors.push('Missing or invalid "version". Expected "' + PLAN_VERSION + '".');
  }

  if (!PLAN_SCENE_TYPES.includes(plan.sceneType)) {
    errors.push('"sceneType" must be one of: ' + PLAN_SCENE_TYPES.join(', ') + '.');
  }

  validateSubject(plan.subject, 'subject', errors);

  if (plan.secondarySubjects !== undefined) {
    if (!Array.isArray(plan.secondarySubjects)) {
      errors.push('"secondarySubjects" must be an array when provided.');
    } else {
      if (plan.secondarySubjects.length > 3) {
        errors.push('"secondarySubjects" must contain at most 3 items.');
      }

      plan.secondarySubjects.forEach(function (subject, index) {
        validateSubject(subject, 'secondarySubjects[' + index + ']', errors);
      });
    }
  }

  if (!isObject(plan.motion)) {
    errors.push('"motion" must be an object.');
  } else {
    if (!PLAN_MOTION_TYPES.includes(plan.motion.type)) {
      errors.push('"motion.type" must be one of: ' + PLAN_MOTION_TYPES.join(', ') + '.');
    }

    if (typeof plan.motion.loop !== 'boolean') {
      errors.push('"motion.loop" must be a boolean.');
    }
  }

  if (!isObject(plan.style)) {
    errors.push('"style" must be an object.');
  } else {
    if (!PLAN_COMPLEXITY_LEVELS.includes(plan.style.complexity)) {
      errors.push('"style.complexity" must be one of: ' + PLAN_COMPLEXITY_LEVELS.join(', ') + '.');
    }

    if (!PLAN_MOOD_TYPES.includes(plan.style.mood)) {
      errors.push('"style.mood" must be one of: ' + PLAN_MOOD_TYPES.join(', ') + '.');
    }
  }

  return { valid: errors.length === 0, errors };
}

module.exports = { validateAnimationPlan };
