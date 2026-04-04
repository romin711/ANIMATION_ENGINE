'use strict';

const { round } = require('../utils/MathUtils');

// ─────────────────────────────────────────────────────────────────────────────
// Douglas-Peucker line simplification
// Recursively removes points that deviate less than epsilon from the
// straight line connecting their neighbors.
// Time complexity: O(n log n) average, O(n²) worst case.
// ─────────────────────────────────────────────────────────────────────────────

function perpendicularDistance(px, py, ax, ay, bx, by) {
  const dx = bx - ax;
  const dy = by - ay;
  const lenSq = dx * dx + dy * dy;

  if (lenSq === 0) {
    // Degenerate segment — return distance to the point
    const ex = px - ax, ey = py - ay;
    return Math.sqrt(ex * ex + ey * ey);
  }

  return Math.abs(dy * px - dx * py + bx * ay - by * ax) / Math.sqrt(lenSq);
}

function douglasPeucker(points, epsilon, getX, getY) {
  if (points.length <= 2) return points;

  const first = points[0];
  const last  = points[points.length - 1];

  let maxDist = 0;
  let maxIdx  = 0;

  for (let i = 1; i < points.length - 1; i++) {
    const dist = perpendicularDistance(
      getX(points[i]), getY(points[i]),
      getX(first),     getY(first),
      getX(last),      getY(last)
    );
    if (dist > maxDist) {
      maxDist = dist;
      maxIdx  = i;
    }
  }

  if (maxDist > epsilon) {
    const left  = douglasPeucker(points.slice(0, maxIdx + 1), epsilon, getX, getY);
    const right = douglasPeucker(points.slice(maxIdx),        epsilon, getX, getY);
    return left.slice(0, -1).concat(right);
  }

  return [first, last];
}

// ─────────────────────────────────────────────────────────────────────────────
// Uniform subsampling — when the array is still too large after D-P
// ─────────────────────────────────────────────────────────────────────────────

function subsample(keyframes, maxCount) {
  if (keyframes.length <= maxCount) return keyframes;

  const step   = Math.ceil(keyframes.length / maxCount);
  const result = keyframes.filter((_, i) => i % step === 0);

  // Always keep the last frame
  if (result[result.length - 1] !== keyframes[keyframes.length - 1]) {
    result.push(keyframes[keyframes.length - 1]);
  }

  return result;
}

// ─────────────────────────────────────────────────────────────────────────────
// Re-normalize time values after filtering changes the indices
// ─────────────────────────────────────────────────────────────────────────────

function renormalizeTime(keyframes) {
  const last = keyframes.length - 1;
  return keyframes.map((kf, i) =>
    Object.assign({}, kf, { time: round(i / last, 4) })
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main export
// epsilon: spatial tolerance in pixels (higher = fewer keyframes)
// maxKeyframes: hard cap after simplification
// ─────────────────────────────────────────────────────────────────────────────

function optimizeKeyframes(keyframes, animType, epsilon = 1.2, maxKeyframes = 40) {
  if (!keyframes || keyframes.length <= 2) return keyframes;

  let result = keyframes;

  // Spatial simplification only makes sense for position-based animations
  if (animType === 'move') {
    result = douglasPeucker(
      keyframes,
      epsilon,
      kf => kf.x || 0,
      kf => kf.y || 0
    );
  }

  // Hard cap — subsample if still too many
  if (result.length > maxKeyframes) {
    result = subsample(result, maxKeyframes);
  }

  // Re-normalize time after any filtering
  return renormalizeTime(result);
}

module.exports = { optimizeKeyframes, douglasPeucker, subsample };