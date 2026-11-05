// Springs for everything that moves. A spring carries its velocity, so any new target continues from exactly
// where it is: nothing ever snaps. Exact solutions, so a slow frame cannot make them unstable.

export type Spring = { x: number; v: number };

/** Critically damped: reaches the target with no overshoot. */
export function critical(s: Spring, target: number, omega: number, dt: number): void {
  const e = Math.exp(-omega * dt);
  const delta = s.x - target;
  const tmp = (s.v + omega * delta) * dt;
  s.x = target + (delta + tmp) * e;
  s.v = (s.v - omega * tmp) * e;
}

/** Under-damped: a small overshoot, set by zeta below 1. */
export function underdamped(s: Spring, target: number, omega: number, zeta: number, dt: number): void {
  const wd = omega * Math.sqrt(1 - zeta * zeta);
  const e = Math.exp(-zeta * omega * dt);
  const c = Math.cos(wd * dt);
  const sn = Math.sin(wd * dt);
  const delta = s.x - target;
  const a = delta;
  const b = (s.v + zeta * omega * delta) / wd;
  s.x = target + e * (a * c + b * sn);
  s.v = e * ((-zeta * omega) * (a * c + b * sn) + wd * (-a * sn + b * c));
}

export function settled(s: Spring, target: number, epsX: number, epsV: number): boolean {
  return Math.abs(s.x - target) < epsX && Math.abs(s.v) < epsV;
}

const clamp01 = (u: number) => (u < 0 ? 0 : u > 1 ? 1 : u);

/** A cubic bezier from (0,0) to (1,1), sampled once into a table, so reading it costs nothing per frame. */
export function sampledEase(x1: number, y1: number, x2: number, y2: number, n = 96): (u: number) => number {
  const table = new Float32Array(n + 1);
  const bez = (t: number, a: number, b: number) => 3 * (1 - t) * (1 - t) * t * a + 3 * (1 - t) * t * t * b + t * t * t;
  for (let i = 0; i <= n; i++) {
    const x = i / n;
    let lo = 0;
    let hi = 1;
    for (let k = 0; k < 24; k++) {
      const t = (lo + hi) / 2;
      if (bez(t, x1, x2) < x) lo = t;
      else hi = t;
    }
    table[i] = bez((lo + hi) / 2, y1, y2);
  }
  return (u: number) => {
    const p = clamp01(u) * n;
    const i = Math.min(n - 1, Math.floor(p));
    return table[i] + (table[i + 1] - table[i]) * (p - i);
  };
}
