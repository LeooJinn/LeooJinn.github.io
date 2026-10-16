// Rocket landing environment used by the Build Lab demo.
// Pure physics, no DOM, so it can be driven by the UI, a keyboard, or the autopilot below.
// This is the *environment*: gravity, thrust, fuel, a pad, and a shaped reward. It is not
// the reinforcement-learning agent (that lives in the rocket-landing-rl repository); the autopilot is a
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

  // ---- drawing (shared by the lab demo and the project preview)
  const stars = Array.from({ length: 70 }, (_, i) => ({ x: ((i * 97) % 640) + 3, y: (i * 53) % 330, r: 0.6 + ((i * 7) % 10) / 12 }));

  function hillY(x) {
    return GROUND - 18 - 16 * Math.sin(x * 0.011) - 10 * Math.sin(x * 0.027 + 1.3);
  }

  function render(ctx, sim, view) {
    const { now = 0, trail = [], particles = [] } = view || {};
    const sky = ctx.createLinearGradient(0, 0, 0, H);
    sky.addColorStop(0, '#050a18');
    sky.addColorStop(0.6, '#0b1a3a');
    sky.addColorStop(1, '#15305e');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, W, H);

    ctx.fillStyle = 'rgba(210, 225, 255, 0.75)';
    stars.forEach((star) => {
      ctx.globalAlpha = 0.35 + 0.4 * Math.abs(Math.sin(now / 1400 + star.x));
      ctx.beginPath();
      ctx.arc(star.x, star.y, star.r, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.globalAlpha = 1;

    ctx.beginPath();
    ctx.moveTo(0, H);
    for (let x = 0; x <= W; x += 8) ctx.lineTo(x, hillY(x));
    ctx.lineTo(W, H);
    ctx.fillStyle = '#0a1830';
    ctx.fill();

    ctx.fillStyle = '#0d1f3d';
    ctx.fillRect(0, GROUND, W, H - GROUND);
    ctx.fillStyle = 'rgba(131, 170, 255, 0.25)';
    ctx.fillRect(0, GROUND, W, 2);

    // landing pad
    const pad = sim.pad;
    const glow = ctx.createRadialGradient(pad.x, GROUND, 4, pad.x, GROUND, pad.w);
    glow.addColorStop(0, 'rgba(103, 226, 209, 0.35)');
    glow.addColorStop(1, 'rgba(103, 226, 209, 0)');
    ctx.fillStyle = glow;
    ctx.fillRect(pad.x - pad.w, GROUND - pad.w, pad.w * 2, pad.w);
    ctx.fillStyle = '#67e2d1';
    ctx.fillRect(pad.x - pad.w / 2, GROUND - 2, pad.w, 6);
    ctx.fillStyle = '#07101d';
    for (let i = 0; i < 6; i += 1) ctx.fillRect(pad.x - pad.w / 2 + 8 + i * 21, GROUND - 1, 9, 3);

    // trail
    if (trail.length > 1) {
      for (let i = 1; i < trail.length; i += 1) {
        ctx.strokeStyle = `rgba(160, 195, 255, ${(i / trail.length) * 0.4})`;
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        ctx.moveTo(trail[i - 1][0], trail[i - 1][1]);
        ctx.lineTo(trail[i][0], trail[i][1]);
        ctx.stroke();
      }
    }

    // particles
    particles.forEach((particle) => {
      ctx.globalAlpha = clamp(particle.life, 0, 1);
      ctx.fillStyle = particle.color;
      ctx.beginPath();
      ctx.arc(particle.x, particle.y, particle.r, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.globalAlpha = 1;

    if (sim.status !== 'crashed') drawRocket(ctx, sim, now);
  }

  function drawRocket(ctx, sim, now) {
    ctx.save();
    ctx.translate(sim.x, sim.y);
    ctx.rotate(sim.a);
    if (sim.thrusting) {
      const length = 16 + Math.sin(now / 38) * 5 + 6;
      const flame = ctx.createLinearGradient(0, 18, 0, 18 + length);
      flame.addColorStop(0, '#fff6d6');
      flame.addColorStop(0.35, '#ffb347');
      flame.addColorStop(1, 'rgba(255, 90, 60, 0)');
      ctx.fillStyle = flame;
      ctx.beginPath();
      ctx.moveTo(-5.5, 18);
      ctx.lineTo(0, 18 + length);
      ctx.lineTo(5.5, 18);
      ctx.fill();
    }
    ctx.strokeStyle = '#9fb7e8';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-8, 16);
    ctx.lineTo(-13, 22);
    ctx.moveTo(8, 16);
    ctx.lineTo(13, 22);
    ctx.stroke();
    ctx.fillStyle = '#5b8cff';
    ctx.beginPath();
    ctx.moveTo(-9, 4);
    ctx.lineTo(-17, 18);
    ctx.lineTo(-9, 16);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(9, 4);
    ctx.lineTo(17, 18);
    ctx.lineTo(9, 16);
    ctx.fill();
    const body = ctx.createLinearGradient(-9, 0, 9, 0);
    body.addColorStop(0, '#c9daff');
    body.addColorStop(0.5, '#f4f8ff');
    body.addColorStop(1, '#9db8f0');
    ctx.fillStyle = body;
    ctx.beginPath();
    ctx.moveTo(0, -24);
    ctx.bezierCurveTo(9, -14, 9, -6, 9, 0);
    ctx.lineTo(9, 18);
    ctx.lineTo(-9, 18);
    ctx.lineTo(-9, 0);
    ctx.bezierCurveTo(-9, -6, -9, -14, 0, -24);
    ctx.fill();
    ctx.fillStyle = '#0b1a3a';
    ctx.beginPath();
    ctx.arc(0, -5, 4.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#67e2d1';
    ctx.beginPath();
    ctx.arc(-1, -6, 1.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  return { W, H, GROUND, HALF_HEIGHT, PAD_W, create, step, autopilot, render };
});
