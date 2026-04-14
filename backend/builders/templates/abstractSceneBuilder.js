'use strict';

const { createScene, getVariantFromPrompt, slugify } = require('../builderUtils');

function paletteForMood(mood) {
  const palettes = {
    clean: { background: '#0f172a', accent: '#e2e8f0', support: '#38bdf8' },
    calm: { background: '#102a43', accent: '#bae6fd', support: '#67e8f9' },
    dramatic: { background: '#1f2937', accent: '#f8fafc', support: '#fb7185' },
    futuristic: { background: '#08111f', accent: '#67e8f9', support: '#22d3ee' },
    playful: { background: '#1e1b4b', accent: '#f9a8d4', support: '#facc15' }
  };

  return palettes[mood] || palettes.clean;
}

function inferSubjectRole(subject) {
  const label = String(subject?.label || '').toLowerCase();

  if (subject?.type === 'text') return 'text';
  if (label.includes('city') || label.includes('skyline') || label.includes('building')) return 'city';
  if (label.includes('particle')) return 'particles';
  return 'shape';
}

function layoutForRole(role, variant) {
  const xOffset = [-24, 0, 28][variant];
  const yOffset = [12, 0, -14][variant];

  if (role === 'text') {
    return { x: 400 + xOffset, y: 145 + yOffset };
  }

  if (role === 'city') {
    return { x: 400 + xOffset, y: 315 };
  }

  if (role === 'particles') {
    return { x: 610 + xOffset, y: 250 + yOffset };
  }

  return { x: 215 + xOffset, y: 245 + yOffset };
}

function buildTextElement(subject, position, index, palette) {
  const label = String(subject?.label || 'Title');
  const fontSize = index === 0 ? 42 : 34;
  const estimatedWidth = label.length * (fontSize * 0.27);

  return [{
    id: slugify(label, 'headline') + '-text',
    type: 'text',
    x: Math.max(90, position.x - estimatedWidth / 2),
    y: position.y,
    content: label,
    fontSize,
    fontWeight: 'bold',
    fill: subject?.color || palette.accent,
    opacity: 1
  }];
}

function buildParticleElements(subject, position, palette) {
  const baseColor = subject?.color || palette.support;
  const dots = [
    { dx: 0, dy: 0, r: 12 },
    { dx: -42, dy: 46, r: 4 },
    { dx: -18, dy: 36, r: 3 },
    { dx: 22, dy: 52, r: 3 },
    { dx: -46, dy: 18, r: 3 },
    { dx: 4, dy: 18, r: 3 }
  ];

  return dots.map(function (dot, index) {
    return {
      id: index === 0 ? 'accent-cluster' : 'accent-dot-' + index,
      type: 'circle',
      x: position.x + dot.dx,
      y: position.y + dot.dy,
      radius: dot.r,
      fill: baseColor,
      opacity: index === 0 ? 1 : 0.72
    };
  });
}

function buildCityElements(subject, position, palette) {
  const fill = subject?.color || palette.support;
  const accent = palette.accent;
  const buildings = [
    { id: 'skyline-b1', x: position.x - 120, y: position.y - 30, width: 42, height: 108 },
    { id: 'skyline-b2', x: position.x - 64, y: position.y - 58, width: 54, height: 136 },
    { id: 'skyline-b3', x: position.x + 4, y: position.y - 12, width: 48, height: 90 },
    { id: 'skyline-b4', x: position.x + 66, y: position.y - 74, width: 62, height: 152 },
    { id: 'skyline-b5', x: position.x + 142, y: position.y - 24, width: 40, height: 102 }
  ];

  const elements = buildings.map(function (building, index) {
    return {
      id: building.id,
      type: 'rect',
      x: building.x,
      y: building.y,
      width: building.width,
      height: building.height,
      rx: 8,
      fill: index % 2 === 0 ? fill : accent,
      opacity: 0.95
    };
  });

  elements.push({
    id: 'skyline-ground',
    type: 'rect',
    x: position.x - 170,
    y: position.y + 78,
    width: 360,
    height: 6,
    rx: 3,
    fill: accent,
    opacity: 0.45
  });

  return elements;
}

function buildShapeElement(subject, position, palette) {
  const label = String(subject?.label || 'Object').toLowerCase();
  const fill = subject?.color || palette.support;

  if (subject?.type === 'square') {
    return [{
      id: slugify(subject?.label, 'shape') + '-shape',
      type: 'rect',
      x: position.x - 40,
      y: position.y - 40,
      width: 80,
      height: 80,
      rx: 12,
      fill,
      opacity: 1
    }];
  }

  return [{
    id: slugify(label, 'shape') + '-shape',
    type: 'circle',
    x: position.x,
    y: position.y,
    radius: label.includes('particle') ? 12 : 34,
    fill,
    opacity: 1
  }];
}

function buildElementsForSubject(subject, index, palette, variant) {
  const role = inferSubjectRole(subject);
  const position = layoutForRole(role, variant);

  if (role === 'text') return buildTextElement(subject, position, index, palette);
  if (role === 'city') return buildCityElements(subject, position, palette);
  if (role === 'particles') return buildParticleElements(subject, position, palette);
  return buildShapeElement(subject, position, palette);
}

function animateText(element, loop, index) {
  return {
    id: element.id + '-reveal',
    target: element.id,
    type: 'move',
    from: { x: element.x, y: element.y + 18 },
    to: { x: element.x, y: element.y },
    duration: 1 + index * 0.12,
    delay: index * 0.08,
    ease: 'power2.out',
    repeat: loop ? -1 : 0,
    yoyo: false
  };
}

function animateParticle(element, loop, index) {
  const drift = index === 0 ? 12 : 8;
  return {
    id: element.id + '-move',
    target: element.id,
    type: 'move',
    from: { x: element.x - drift, y: element.y + 10 },
    to: { x: element.x + drift, y: element.y - 10 },
    duration: 2.8 + index * 0.14,
    delay: index * 0.06,
    ease: 'sine.inOut',
    repeat: loop ? -1 : 0,
    yoyo: true
  };
}

function animateCity(element, loop, index) {
  if (element.id === 'skyline-ground') {
    return {
      id: element.id + '-fade',
      target: element.id,
      type: 'fade',
      from: { opacity: 0.2 },
      to: { opacity: 0.45 },
      duration: 1.4,
      delay: 0.15,
      ease: 'sine.inOut',
      repeat: loop ? -1 : 0,
      yoyo: true
    };
  }

  return {
    id: element.id + '-fade',
    target: element.id,
    type: 'fade',
    from: { opacity: 0.18 },
    to: { opacity: element.opacity ?? 0.95 },
    duration: 0.8 + index * 0.08,
    delay: index * 0.08,
    ease: 'power2.out',
    repeat: 0,
    yoyo: false
  };
}

function animateShape(element, loop) {
  return {
    id: element.id + '-move',
    target: element.id,
    type: 'move',
    from: { x: element.x - 14, y: element.y + 12 },
    to: { x: element.x + 14, y: element.y - 12 },
    duration: 2.8,
    delay: 0,
    ease: 'sine.inOut',
    repeat: loop ? -1 : 0,
    yoyo: true
  };
}

function buildTimeline(elements, subjects, loop) {
  return elements.map(function (element, index) {
    const matchingSubject = subjects.find(function (subject) {
      const role = inferSubjectRole(subject);
      if (role === 'text') return element.type === 'text' && element.content === subject.label;
      if (role === 'city') return element.id.startsWith('skyline-');
      if (role === 'particles') return element.id === 'accent-cluster' || element.id.startsWith('accent-dot-');
      return element.id.startsWith(slugify(subject.label, 'shape'));
    }) || subjects[0];

    const role = inferSubjectRole(matchingSubject);

    if (role === 'text') return animateText(element, false, index);
    if (role === 'city') return animateCity(element, loop, index);
    if (role === 'particles') return animateParticle(element, loop, index);
    return animateShape(element, loop);
  });
}

function prioritizeSubjects(subjects) {
  const roleOrder = { city: 0, text: 1, particles: 2, shape: 3 };

  return subjects.slice().sort(function (left, right) {
    return roleOrder[inferSubjectRole(left)] - roleOrder[inferSubjectRole(right)];
  });
}

function buildAbstractScene(plan) {
  console.log('BUILDER_USED:', 'abstractSceneBuilder');
  const palette = paletteForMood(plan?.style?.mood);
  const variant = getVariantFromPrompt(plan?.prompt || plan?.subject?.label || 'abstract');
  const subjects = prioritizeSubjects([plan.subject].concat(plan.secondarySubjects || []).slice(0, 3));
  const elements = subjects.flatMap(function (subject, index) {
    return buildElementsForSubject(subject, index, palette, variant);
  });
  const loop = plan?.motion?.loop !== false;
  const timeline = buildTimeline(elements, subjects, loop);

  return createScene(palette.background, elements, timeline);
}

module.exports = buildAbstractScene;
