'use strict';

const { extractQuotedText } = require('../../processors/PromptClassifier');

function positionSet(variant, count) {
  const sets = [
    [{ x: 210, y: 246 }, { x: 400, y: 184 }, { x: 590, y: 246 }],
    [{ x: 210, y: 196 }, { x: 400, y: 254 }, { x: 590, y: 196 }],
    [{ x: 240, y: 225 }, { x: 400, y: 154 }, { x: 560, y: 275 }]
  ];

  return sets[variant].slice(0, count);
}

function elementForSubject(subject, index, position) {
  if (subject?.type === 'text') {
    const label = String(subject?.label || 'Title');
    return {
      id: 'subject-' + index,
      type: 'text',
      x: Math.max(90, position.x - (label.length * 9)),
      y: position.y,
      content: label,
      fontSize: 34,
      fontWeight: 'bold',
      fill: subject?.color || '#f8fafc',
      opacity: 1
    };
  }

  if (subject?.label === 'Particles') {
    return {
      id: 'subject-' + index,
      type: 'circle',
      x: position.x,
      y: position.y,
      radius: 14,
      fill: subject?.color || '#38bdf8',
      opacity: 0.92
    };
  }

  if (subject?.type === 'square') {
    return {
      id: 'subject-' + index,
      type: 'rect',
      x: position.x - 34,
      y: position.y - 34,
      width: 68,
      height: 68,
      rx: 12,
      fill: subject?.color || '#f97316',
      opacity: 1
    };
  }

  return {
    id: 'subject-' + index,
    type: 'circle',
    x: position.x,
    y: position.y,
    radius: 30 - Math.min(8, index * 3),
    fill: subject?.color || '#38bdf8',
    opacity: 1
  };
}

function animationForElement(element, index, variant) {
  if (element.type === 'text') {
    return {
      id: 'subject-anim-' + index,
      target: element.id,
      type: 'move',
      from: { x: element.x, y: element.y + [18, -14, 22][variant] },
      to: { x: element.x, y: element.y },
      duration: 1.1 + (variant * 0.08),
      delay: index * 0.08,
      ease: 'power2.out',
      repeat: 0,
      yoyo: false
    };
  }

  return {
    id: 'subject-anim-' + index,
    target: element.id,
    type: 'move',
    from: { x: element.x - 16, y: element.y + 14 },
    to: { x: element.x + 16, y: element.y - 14 },
    duration: 2 + (index * 0.16) + (variant * 0.08),
    delay: index * 0.09,
    ease: 'sine.inOut',
    repeat: -1,
    yoyo: true
  };
}

function buildMultiSubjectScene(plan, physicsModules, utils) {
  console.log('BUILDER_USED:', 'multiSubjectSceneBuilder');

  const prompt = plan?.prompt || '';
  const variant = utils.getVariantFromPrompt(prompt);
  const palette = [
    { background: '#0b1120', accent: '#93c5fd' },
    { background: '#111827', accent: '#f9a8d4' },
    { background: '#0f172a', accent: '#5eead4' }
  ][variant];
  const subjects = [plan?.subject].concat(plan?.secondarySubjects || []).filter(Boolean).slice(0, 3);
  const positions = positionSet(variant, subjects.length);
  const elements = subjects.map(function (subject, index) {
    return elementForSubject(subject, index, positions[index]);
  });
  const title = extractQuotedText(prompt);

  if (title && !subjects.some(function (subject) { return subject?.type === 'text'; })) {
    elements.push({
      id: 'subject-title',
      type: 'text',
      x: Math.max(100, 400 - (title.length * 10)),
      y: 116,
      content: title,
      fontSize: 32,
      fontWeight: 'bold',
      fill: palette.accent,
      opacity: 1
    });
  }

  const timeline = elements.map(function (element, index) {
    if (element.id === 'subject-title') {
      return {
        id: 'subject-title-anim',
        target: element.id,
        type: 'fade',
        from: { opacity: 0 },
        to: { opacity: 1 },
        duration: 0.9,
        delay: 0.1,
        ease: 'power2.out',
        repeat: 0,
        yoyo: false
      };
    }

    return animationForElement(element, index, variant);
  });

  return utils.createScene(palette.background, elements, timeline);
}

module.exports = buildMultiSubjectScene;
