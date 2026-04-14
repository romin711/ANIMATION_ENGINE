'use strict';

const { detectHexColor, extractQuotedText } = require('../../processors/PromptClassifier');
const { clamp, createScene } = require('../builderUtils');

function buildText(plan, physicsModules, utils) {
  console.log('BUILDER_USED:', 'textBuilder');
  const prompt = plan?.prompt || '';
  const variant = utils.getVariantFromPrompt(prompt);
  const content = extractQuotedText(prompt) || plan?.subject?.label || 'Title';
  const fill = plan?.subject?.color || detectHexColor(prompt, '#f8fafc');
  const motionType = plan?.motion?.type || 'reveal';
  const fontSize = clamp(58 - Math.max(0, content.length - 10), 26, 56);
  const y = [240, 214, 262][variant];
  const x = clamp((variant === 1 ? 380 : 400) - content.length * (fontSize * 0.22), 90, 360);
  const element = {
    id: 'headline-text',
    type: 'text',
    x,
    y,
    content,
    fontSize,
    fontWeight: 'bold',
    fill,
    opacity: 1
  };

  const animation = motionType === 'fade'
      ? {
        id: 'headline-text-fade',
        target: element.id,
        type: 'fade',
        from: { opacity: 0 },
        to: { opacity: 1 },
        duration: 1 + (variant * 0.1),
        delay: variant * 0.05,
        ease: 'power2.out',
        repeat: 0,
        yoyo: false
      }
    : {
        id: 'headline-text-reveal',
        target: element.id,
        type: 'move',
        from: { x: element.x, y: element.y + [20, -16, 24][variant] },
        to: { x: element.x, y: element.y },
        duration: 1.1 + (variant * 0.08),
        delay: variant * 0.04,
        ease: 'power2.out',
        repeat: 0,
        yoyo: false
      };

  return createScene('#0f172a', [element], [animation]);
}

module.exports = buildText;
