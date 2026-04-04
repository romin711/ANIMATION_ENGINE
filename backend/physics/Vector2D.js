'use strict';

/**
 * Immutable 2D vector.
 * Every operation returns a new Vector2D — no mutation.
 */
class Vector2D {
  constructor(x = 0, y = 0) {
    this.x = x;
    this.y = y;
    Object.freeze(this);
  }

  add(v)    { return new Vector2D(this.x + v.x, this.y + v.y); }
  sub(v)    { return new Vector2D(this.x - v.x, this.y - v.y); }
  scale(s)  { return new Vector2D(this.x * s,   this.y * s); }
  negate()  { return new Vector2D(-this.x, -this.y); }

  dot(v)    { return this.x * v.x + this.y * v.y; }
  cross(v)  { return this.x * v.y - this.y * v.x; }

  magnitudeSq() { return this.x * this.x + this.y * this.y; }
  magnitude()   { return Math.sqrt(this.magnitudeSq()); }

  normalize() {
    const m = this.magnitude();
    return m === 0 ? Vector2D.ZERO : new Vector2D(this.x / m, this.y / m);
  }

  // Limit magnitude to a maximum value
  limit(max) {
    const m = this.magnitude();
    return m > max ? this.normalize().scale(max) : this;
  }

  distance(v)   { return this.sub(v).magnitude(); }
  distanceSq(v) { return this.sub(v).magnitudeSq(); }

  // Angle of this vector in radians
  angle() { return Math.atan2(this.y, this.x); }

  // Angle between this vector and another
  angleTo(v) { return Math.atan2(v.y - this.y, v.x - this.x); }

  // Rotate by angle (radians)
  rotate(angle) {
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    return new Vector2D(
      this.x * cos - this.y * sin,
      this.x * sin + this.y * cos
    );
  }

  // Perpendicular vector (90° counter-clockwise)
  perpendicular() { return new Vector2D(-this.y, this.x); }

  // Linear interpolation toward v
  lerp(v, t) {
    return new Vector2D(
      this.x + (v.x - this.x) * t,
      this.y + (v.y - this.y) * t
    );
  }

  // Reflect this vector across a normal
  reflect(normal) {
    const n = normal.normalize();
    return this.sub(n.scale(2 * this.dot(n)));
  }

  clone()    { return new Vector2D(this.x, this.y); }
  toObject() { return { x: this.x, y: this.y }; }
  toString() { return 'Vector2D(' + this.x.toFixed(2) + ', ' + this.y.toFixed(2) + ')'; }

  // ── Static constructors ───────────────────────────────────────────────────

  // Vector with given angle and magnitude
  static fromAngle(angle, magnitude = 1) {
    return new Vector2D(Math.cos(angle) * magnitude, Math.sin(angle) * magnitude);
  }

  // Vector from one point to another
  static fromTo(ax, ay, bx, by) {
    return new Vector2D(bx - ax, by - ay);
  }

  static zero() { return new Vector2D(0, 0); }
}

// Reusable constant
Vector2D.ZERO = new Vector2D(0, 0);

module.exports = Vector2D;