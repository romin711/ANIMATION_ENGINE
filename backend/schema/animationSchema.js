'use strict';

/**
 * The canonical Animation JSON Schema for the AI Animation Generator.
 *
 * This defines the contract between:
 * - Gemini output (via geminiService.js)
 * - The validator (animationValidator.js)
 * - The frontend GSAP renderer (AnimationCanvas.jsx)
 *
 * Supported element types: circle, rect, text
 * Supported animation types: move, fade, scale, rotate, color
 */
const ANIMATION_SCHEMA = {
  version: '1.0',
  canvas: {
    width: 800,
    height: 450,
    background: '#1a1a2e'
  },
  elements: [
    {
      id: 'example-circle',
      type: 'circle',      // 'circle' | 'rect' | 'text'
      x: 100,
      y: 225,
      radius: 40,
      fill: '#e94560',
      opacity: 1,
      label: 'Optional label'
    },
    {
      id: 'example-rect',
      type: 'rect',
      x: 400,
      y: 175,
      width: 100,
      height: 100,
      fill: '#0f3460',
      opacity: 1
    },
    {
      id: 'example-text',
      type: 'text',
      x: 400,
      y: 60,
      content: 'Hello World',
      fontSize: 32,
      fill: '#ffffff',
      opacity: 1
    }
  ],
  timeline: [
    {
      id: 'anim-move',
      target: 'example-circle',
      type: 'move',                // 'move' | 'fade' | 'scale' | 'rotate' | 'color'
      from: { x: 100, y: 225 },
      to: { x: 600, y: 225 },
      duration: 2.0,
      delay: 0,
      ease: 'power2.inOut',
      repeat: -1,                  // -1 = infinite, 0 = once
      yoyo: true
    },
    {
      id: 'anim-fade',
      target: 'example-rect',
      type: 'fade',
      from: { opacity: 0 },
      to: { opacity: 1 },
      duration: 1.5,
      delay: 0.5,
      ease: 'power1.out',
      repeat: 0,
      yoyo: false
    }
  ]
};

module.exports = { ANIMATION_SCHEMA };
