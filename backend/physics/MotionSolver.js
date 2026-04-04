'use strict';

const { round } = require('../utils/MathUtils');

// ─────────────────────────────────────────────────────────────────────────────
// Convert raw simulation position samples → normalized keyframe array.
// time is normalized 0–1 (fraction of total duration).
// ─────────────────────────────────────────────────────────────────────────────

function positionsToKeyframes(positions, extraProps = {}) {
  if (!positions || positions.length === 0) return [];

  const last = positions.length - 1;

  return positions.map((pos, i) => {
    const kf = {
      time: round(i / last, 4),
      x:    pos.x,
      y:    pos.y
    };

    // Merge extra per-frame properties (opacity, scale, etc.)
    if (pos.opacity  !== undefined) kf.opacity  = pos.opacity;
    if (pos.scale    !== undefined) kf.scale    = pos.scale;
    if (pos.scaleX   !== undefined) kf.scaleX   = pos.scaleX;
    if (pos.scaleY   !== undefined) kf.scaleY   = pos.scaleY;
    if (pos.rotation !== undefined) kf.rotation = pos.rotation;

    // Merge static extra props (same value on every frame)
    return Object.assign(kf, extraProps);
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Convert per-particle history arrays → array of keyframe arrays.
// Useful for multi-particle systems where each particle gets its own
// timeline entry.
// ─────────────────────────────────────────────────────────────────────────────

function particleHistoriesToKeyframeArrays(histories) {
  return histories.map(history => positionsToKeyframes(history));
}

// ─────────────────────────────────────────────────────────────────────────────
// Build synthetic timeline entries for a particle system.
// Takes the AI's template timeline entry + particle histories,
// and produces one timeline entry per particle.
// ─────────────────────────────────────────────────────────────────────────────

function buildParticleTimelineEntries(templateAnim, elementIds, histories) {
  return elementIds.map((id, i) => {
    const history   = histories[i] || [];
    const keyframes = positionsToKeyframes(history);

    return Object.assign({}, templateAnim, {
      id:        templateAnim.id + '-p' + i,
      target:    id,
      keyframes,
      _physicsIntent: 'PARTICLE'
    });
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Merge two keyframe channels that have the same time values.
// E.g. position keyframes + opacity keyframes → single merged array.
// ─────────────────────────────────────────────────────────────────────────────

function mergeKeyframeChannels(...channelArrays) {
  if (channelArrays.length === 0) return [];

  const base   = channelArrays[0];
  const others = channelArrays.slice(1);

  return base.map((kf, i) => {
    const merged = Object.assign({}, kf);
    others.forEach(ch => {
      if (ch[i]) Object.assign(merged, ch[i]);
    });
    return merged;
  });
}

module.exports = {
  positionsToKeyframes,
  particleHistoriesToKeyframeArrays,
  buildParticleTimelineEntries,
  mergeKeyframeChannels
};