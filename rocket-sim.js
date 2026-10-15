// Rocket landing environment used by the Build Lab demo.
// Pure physics, no DOM, so it can be driven by the UI, a keyboard, or the autopilot below.
// This is the *environment*: gravity, thrust, fuel, a pad, and a shaped reward. It is not
// the reinforcement-learning agent (that project is still in progress); the autopilot is a
// hand-written controller used to show the loop end to end.
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.RocketSim = api;
})(typeof self !== 'undefined' ? self : this, function () {
  const W = 640;
  const H = 420;
  const GROUND = 372;
  const HALF_HEIGHT = 22; // distance from rocket centre to its feet
  const PAD_W = 132;

  const GRAVITY = 62;
  const THRUST = 150;
  const TORQUE = 3.4;
  const ANGULAR_DAMPING = 0.9;

  const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

  function create(rng = Math.random) {
    const padX = 150 + rng() * (W - 300);
    const side = padX < W / 2 ? 1 : -1;
    const startX = clamp(padX + side * (110 + rng() * 150), 70, W - 70);
    return {
      x: startX,
      y: 56,
      vx: (rng() - 0.5) * 46,
      vy: 0,
      a: (rng() - 0.5) * 0.5,
      w: 0,
      fuel: 100,
      t: 0,
      status: 'flying', // flying | landed | crashed
      pad: { x: padX, w: PAD_W },
      thrusting: false,
      reward: 0,
      parts: { near: 0, slow: 0, upright: 0, fuel: 0, terminal: 0 },
      reason: '',
    };
  }

  function step(s, input, dt) {
    if (s.status !== 'flying') return s;
    let { thrust, left, right } = input;
    if (s.fuel <= 0) {
      thrust = false;
      left = false;
      right = false;
    }

    let torque = 0;
    if (left) torque -= TORQUE;
    if (right) torque += TORQUE;
    s.w += torque * dt;
    s.w *= 1 - ANGULAR_DAMPING * dt;
    s.a += s.w * dt;

    const ax = thrust ? Math.sin(s.a) * THRUST : 0;
    const ay = GRAVITY - (thrust ? Math.cos(s.a) * THRUST : 0);
    s.vx += ax * dt;
    s.vy += ay * dt;
    s.x += s.vx * dt;
    s.y += s.vy * dt;
    s.t += dt;
    s.thrusting = Boolean(thrust);

    s.fuel = clamp(s.fuel - ((thrust ? 14 : 0) + (left || right ? 1.6 : 0)) * dt, 0, 100);

    if (s.x < 14) {
      s.x = 14;
      s.vx = Math.abs(s.vx) * 0.3;
    }
    if (s.x > W - 14) {
      s.x = W - 14;
      s.vx = -Math.abs(s.vx) * 0.3;
    }
    if (s.y < HALF_HEIGHT) {
      s.y = HALF_HEIGHT;
      s.vy = Math.max(0, s.vy);
    }

    // shaped reward: small per-step terms that point the policy at a soft landing
    const dist = Math.abs(s.x - s.pad.x) / W;
    const alt = Math.max(0, GROUND - HALF_HEIGHT - s.y) / GROUND;
    const speed = Math.hypot(s.vx, s.vy);
    const near = -(dist * 1.5 + alt * 0.4) * dt;
    const slow = -(speed / 120) * dt;
    const upright = -(Math.abs(s.a) / 0.6) * 0.8 * dt;
    const fuel = thrust ? -0.3 * dt : 0;
    s.parts.near += near;
    s.parts.slow += slow;
    s.parts.upright += upright;
    s.parts.fuel += fuel;
    s.reward += near + slow + upright + fuel;

    if (s.y + HALF_HEIGHT >= GROUND) {
      s.y = GROUND - HALF_HEIGHT;
      const onPad = Math.abs(s.x - s.pad.x) <= s.pad.w / 2 - 6;
      const gentle = s.vy <= 48 && Math.abs(s.vx) <= 32 && Math.abs(s.a) <= 0.22 && Math.abs(s.w) <= 1.2;
      if (onPad && gentle) {
        s.status = 'landed';
        s.parts.terminal = 100;
        s.reason = 'Soft landing on the pad';
      } else {
        s.status = 'crashed';
        s.parts.terminal = -100;
        if (!onPad) s.reason = 'Missed the pad';
        else if (s.vy > 48) s.reason = 'Came in too fast';
        else if (Math.abs(s.a) > 0.22) s.reason = 'Landed tilted';
        else s.reason = 'Too much sideways speed';
      }
      s.reward += s.parts.terminal;
      s.vx = 0;
      s.vy = 0;
      s.thrusting = false;
    }
    return s;
  }

  // Hand-written controller: aim for a horizontal speed that brings the rocket over the pad,
  // tilt to produce it, and fire the engine whenever it is falling faster than a safe descent
  // speed for its altitude.
  function autopilot(s) {
    const alt = GROUND - HALF_HEIGHT - s.y;
    const dx = s.pad.x - s.x;
    const taper = alt < 90 ? 0.4 + (alt / 90) * 0.6 : 1;
    const vxWanted = clamp(dx * 0.5, -58, 58) * taper;
    let aWanted = clamp((vxWanted - s.vx) * 0.02, -0.36, 0.36);
    if (alt < 70) aWanted *= alt / 70;
    const command = 7 * (aWanted - s.a) - 3.4 * s.w;
    const right = command > 0.3;
    const left = command < -0.3;
    const vyWanted = Math.min(76, 12 + alt * 0.3);
    const thrust = s.vy > vyWanted && Math.abs(s.a) < 0.55 && s.fuel > 0;
    return { thrust, left, right };
  }

  return { W, H, GROUND, HALF_HEIGHT, PAD_W, create, step, autopilot };
});
