// What the room does over time: one camera pose on a spring, one spring per light and per shelf, and a loop that
// draws only while something is changing. No DOM and no React state during motion, so it can move to a worker.
import { focalLength, focusFrame, restPose, TALL_WIDTH, type FocusFrame, type Pose } from "./camera";
import type { Engine, RoomState, ShoeState } from "./engine";
import { SHOE_Z, SLAB, type WallLayout } from "./layout";
import { lightingAt, type Lighting } from "./lighting";
import { critical, sampledEase, settled, underdamped, type Spring } from "./spring";

const STILL_FRAMES = 16;
const POSE_OMEGA = 34; // the spring behind the path: it only smooths what a new command does
const DIM_OMEGA = 5.4; // the room dims over about 100 to 900 ms
const TORCH_OMEGA = 7;
const LOOK_OMEGA = 5;
const LOOK_DEGREES = 1.5;
const CARRY_SECONDS = 0.17; // how long a new path keeps some of the speed the camera already had

const walkEase = sampledEase(0.36, 0.04, 0.16, 1.0); // a slow start, but moving by 150 ms, then a long glide
const backEase = sampledEase(0.42, 0.0, 0.2, 1.0);
const alongEase = sampledEase(0.42, 0.0, 0.24, 1.0);

export type RoomOptions = {
  now?: () => number;
  /** Fine pointer: the torch works. Off on touch. */
  torch?: boolean;
  onFrame?: (info: FrameInfo) => void;
  /** The walk has reached the point where the panel may enter: the path is clear of it. */
  onPanelClear?: () => void;
  /** Walking back, the camera is nearly home: the wall's words may come back without landing on the wrong shoes. */
  onHome?: () => void;
  /** No walking and no torch. States change at once, and the page crossfades them. Light still answers hover. */
  reduced?: boolean;
  rtl?: boolean;
  /** Height of the host's header over the top of the room. */
  detailTop?: number;
  /** A phone: holds fewer large pictures. */
  small?: boolean;
};

export type FrameInfo = {
  t: number;
  dt: number;
  pose: Pose;
  drawCalls: number;
  still: number;
  moving: boolean;
};

type Goal = { x: number; y: number; logD: number; shiftX: number; shiftY: number };

type Path = {
  t0: number;
  delay: number;
  duration: number;
  at: (u: number) => Goal;
  /** Called once when u reaches this share. */
  mark?: { u: number; done: boolean; run: () => void };
};

type ShelfSprings = { level: Spring; exposure: Spring; mip: Spring; amount: Spring; levelTarget: number; pulse: Spring; large: Spring };

const mix = (a: number, b: number, t: number) => a + (b - a) * t;

export function createRoom(engine: Engine, options: RoomOptions = {}) {
  const now = options.now ?? (() => performance.now());
  const reduced = options.reduced ?? false;
  const rtl = options.rtl ?? false;
  const detailTop = options.detailTop ?? 0;
  const hasTorch = (options.torch ?? true) && !reduced;
  let scrollY = 0;

  let layout: WallLayout | null = null;
  let cssW = 0;
  let cssH = 0;
  let dpr = 1;
  const daySpring: Spring = { x: 0, v: 0 };
  let dayTarget = 0;
  let day = 0;
  let lighting: Lighting = lightingAt(0);

  let hovered = -1;
  let focused = -1;
  let frameInfo: FocusFrame | null = null;
  let panelFade: [number, number] = [0.72, 0.8];

  // The pose: x, y, log of the distance from the shoes' plane, lens shift.
  const pose = { x: { x: 0, v: 0 }, y: { x: 0, v: 0 }, logD: { x: 0, v: 0 }, shiftX: { x: 0, v: 0 }, shiftY: { x: 0, v: 0 } };
  let path: Path | null = null;
  let goal: Goal = { x: 0, y: 0, logD: 0, shiftX: 0, shiftY: 0 };
  let focusSince = -1;
  // What the camera was doing when the last command came: it keeps going a little, as a body with weight does.
  let carry = { t0: 0, x: 0, y: 0, logD: 0, shiftX: 0, shiftY: 0, lead: { x: 0, y: 0, logD: 0, shiftX: 0, shiftY: 0 } };

  const dim: Spring = { x: 0, v: 0 };
  let dimTarget = 0;
  const lookX: Spring = { x: 0, v: 0 };
  const lookY: Spring = { x: 0, v: 0 };
  let lookTargetX = 0;
  let lookTargetY = 0;
  const torchX: Spring = { x: 0, v: 0 };
  const torchY: Spring = { x: 0, v: 0 };
  const torchOn: Spring = { x: 0, v: 0 };
  let torchTargetX = 0;
  let torchTargetY = 0;
  let torchTargetOn = 0;

  // The bag: the world dims and softens in the shader, through the same timing as the drawer.
  const bag: Spring = { x: 0, v: 0 };
  let bagTarget = 0;
  // A view or zoom on the focused shoe: how close, and which point of the card stays centred.
  const closer = { zoom: { x: 1, v: 0 }, u: { x: 0.5, v: 0 }, v: { x: 0.5, v: 0 } };
  let closerTarget = { zoom: 1, u: 0.5, v: 0.5, omega: 8 };

  let shelves: ShelfSprings[] = [];
  const shoeStates: ShoeState[] = [];

  let lastT = 0;
  let paused = false;
  let scheduled = false;
  let manual = false;
  let stillIndex = -1;
  let drawnThisFrame = 0;
  let forced = true;

  const toPose = (g: Goal): Pose => ({ x: g.x, y: g.y, z: SHOE_Z + Math.exp(g.logD), pitch: 0, yaw: 0, shiftX: g.shiftX, shiftY: g.shiftY });
  const toGoal = (p: Pose): Goal => ({ x: p.x, y: p.y, logD: Math.log(p.z - SHOE_Z), shiftX: p.shiftX, shiftY: p.shiftY });

  function currentGoal(): Goal {
    return { x: pose.x.x, y: pose.y.x, logD: pose.logD.x, shiftX: pose.shiftX.x, shiftY: pose.shiftY.x };
  }

  /** The screen position of a point on the shoes' plane, through a pose. */
  function screenOf(px: number, py: number, g: Goal): [number, number] {
    const f = focalLength(cssW);
    const k = f / Math.exp(g.logD);
    return [cssW / 2 + (px - g.x) * k + (g.shiftX * cssW) / 2, cssH / 2 + (py - g.y) * k - (g.shiftY * cssH) / 2];
  }

  /**
   * A path towards a shoe or away from it, anchored on the shoe: it travels in a straight line across the screen
   * from wherever it is now to where it ends, while the distance eases. So it never swerves, and a command in
   * mid-walk just starts a new line from the present moment.
   */
  function anchoredPath(anchorX: number, anchorY: number, to: Goal, ease: (u: number) => number, rise: number, settle: number) {
    const from = currentGoal();
    const [sx0, sy0] = screenOf(anchorX, anchorY, from);
    const [sx1, sy1] = screenOf(anchorX, anchorY, to);
    const f = focalLength(cssW);
    return (u: number): Goal => {
      // The settle: past the target by a little, and back. Only the distance does it.
      const over = settle * Math.sin(Math.PI * Math.min(1, Math.max(0, (u - 0.7) / 0.3)));
      const e = ease(u);
      const logD = mix(from.logD, to.logD, e) - over * (from.logD - to.logD);
      const k = f / Math.exp(logD);
      const shiftX = mix(from.shiftX, to.shiftX, e);
      const shiftY = mix(from.shiftY, to.shiftY, e);
      const sx = mix(sx0, sx1, e);
      const sy = mix(sy0, sy1, e) + rise * Math.sin(Math.PI * e);
      return {
        x: anchorX - (sx - cssW / 2 - (shiftX * cssW) / 2) / k,
        y: anchorY - (sy - cssH / 2 + (shiftY * cssH) / 2) / k,
        logD,
        shiftX,
        shiftY,
      };
    };
  }

  function wake() {
    forced = true;
    stillIndex = -1;
    schedule();
  }

  function schedule() {
    if (manual || scheduled || paused) return;
    scheduled = true;
    requestAnimationFrame(tick);
  }

  function startPath(p: Path) {
    // The spring trails its goal a little. Keep that lead too, or the goal jumps back and the camera brakes hard.
    const lead = { x: goal.x - pose.x.x, y: goal.y - pose.y.x, logD: goal.logD - pose.logD.x, shiftX: goal.shiftX - pose.shiftX.x, shiftY: goal.shiftY - pose.shiftY.x };
    carry = { t0: p.t0, x: pose.x.v, y: pose.y.v, logD: pose.logD.v, shiftX: pose.shiftX.v, shiftY: pose.shiftY.v, lead };
    path = p;
    wake();
  }

  /** The present velocity fades into the new path. At the moment of the command the speed is unchanged. */
  function withCarry(g: Goal, t: number): Goal {
    const tau = Math.max(0, t - carry.t0) / 1000;
    if (tau > 1.4) return g;
    const e = Math.exp(-tau / CARRY_SECONDS);
    const f = tau * e;
    const l = carry.lead;
    return {
      x: g.x + carry.x * f + l.x * e,
      y: g.y + carry.y * f + l.y * e,
      logD: g.logD + carry.logD * f + l.logD * e,
      shiftX: g.shiftX + carry.shiftX * f + l.shiftX * e,
      shiftY: g.shiftY + carry.shiftY * f + l.shiftY * e,
    };
  }

  function setLayout(next: WallLayout, width: number, height: number, ratio: number) {
    const first = !layout;
    layout = next;
    cssW = width;
    cssH = height;
    dpr = ratio;
    while (shelves.length < next.slots.length) {
      shelves.push({
        level: { x: 0, v: 0 },
        exposure: { x: lighting.shoeExposure, v: 0 },
        mip: { x: 0, v: 0 },
        amount: { x: 0, v: 0 },
        levelTarget: 0,
        pulse: { x: 0, v: 0 },
        large: { x: 0, v: 0 },
      });
      shoeStates.push({ level: 0, exposure: lighting.shoeExposure, mipBias: 0, fade: 1, panelAmount: 0, largeMix: 0 });
    }
    if (first || focused < 0) {
      goal = toGoal(restPose(next, width, height, scrollY, detailTop));
      if (first) {
        pose.x.x = goal.x;
        pose.y.x = goal.y;
        pose.logD.x = goal.logD;
        pose.shiftX.x = goal.shiftX;
        pose.shiftY.x = goal.shiftY;
        torchX.x = torchTargetX = goal.x;
        torchY.x = torchTargetY = goal.y;
      }
    } else {
      frameInfo = focusFrame(next.slots[focused], width, height, rtl, detailTop);
      panelFade = frameInfo.panelFade;
      goal = toGoal(frameInfo.pose);
    }
    // A new layout ends a walk where it is, and the springs carry the camera to the new frame. A walk cut short still
    // lets the panel in: without that word the focus view waits for a cue that never comes.
    if (path?.mark && !path.mark.done) {
      path.mark.done = true;
      path.mark.run();
    }
    path = null;
    wake();
  }

  /** Night to day is the room's lights coming up, about 700 ms. The first call just sets it. */
  function setTheme(next: number, instant = false) {
    dayTarget = next;
    if (instant || !layout) {
      daySpring.x = next;
      daySpring.v = 0;
      day = next;
      lighting = lightingAt(day);
    }
    wake();
  }

  function hover(index: number) {
    if (index === hovered) return;
    hovered = index;
    wake();
  }

  /** Walk up to a shoe. The click is answered at once: its strip goes to full in this very frame. */
  function open(index: number, instant = false) {
    if (!layout) return;
    const slot = layout.slots[index];
    const wasFocused = focused;
    focused = index;
    for (const s of shelves) s.levelTarget = 0;
    focusSince = now();
    frameInfo = focusFrame(slot, cssW, cssH, rtl, detailTop);
    panelFade = frameInfo.panelFade;
    const to = toGoal(frameInfo.pose);
    dimTarget = 1;
    shelves[index].level.x = 1;
    shelves[index].level.v = 0;
    if (instant || reduced) {
      closer.zoom.x = 1;
      closerTarget = { zoom: 1, u: 0.5, v: 0.5, omega: 8 };
      pose.x.x = to.x;
      pose.y.x = to.y;
      pose.logD.x = to.logD;
      pose.shiftX.x = to.shiftX;
      pose.shiftY.x = to.shiftY;
      pose.x.v = pose.y.v = pose.logD.v = pose.shiftX.v = pose.shiftY.v = 0;
      dim.x = 1;
      goal = to;
      path = null;
      for (let i = 0; i < shelves.length; i++) {
        const s = shelves[i];
        const isFocus = i === index;
        s.exposure.x = isFocus ? 1 : mix(0.3, 0.86, day);
        s.mip.x = isFocus ? 0 : 1.6;
        s.amount.x = isFocus ? 0 : 1;
      }
      options.onPanelClear?.();
      wake();
      return;
    }
    if (wasFocused >= 0 && wasFocused !== index) {
      walkAlongTo(to);
      return;
    }
    const cx = slot.card.x + slot.card.w / 2;
    const cy = slot.slab.y - slot.card.h * 0.4;
    closer.zoom.x = 1;
    closerTarget = { zoom: 1, u: 0.5, v: 0.5, omega: 8 };
    startPath({
      t0: now(),
      delay: 60,
      duration: 1230,
      at: anchoredPath(cx, cy, to, walkEase, -14, 0.012),
      mark: { u: 0.55, done: false, run: () => options.onPanelClear?.() },
    });
  }

  /** On foot along the wall: a pan with a small step back in the middle. */
  function walkAlongTo(to: Goal) {
    const from = currentGoal();
    closerTarget = { zoom: 1, u: 0.5, v: 0.5, omega: 8 };
    startPath({
      t0: now(),
      delay: 0,
      duration: 700,
      mark: { u: 0.3, done: false, run: () => options.onPanelClear?.() },
      at: (u) => {
        const e = alongEase(u);
        return {
          x: mix(from.x, to.x, e),
          y: mix(from.y, to.y, e),
          logD: mix(from.logD, to.logD, e) + 0.06 * Math.sin(Math.PI * e),
          shiftX: mix(from.shiftX, to.shiftX, e),
          shiftY: mix(from.shiftY, to.shiftY, e),
        };
      },
    });
  }

  /** Previous or next, wrapping at the ends. */
  function step(by: number) {
    if (!layout || focused < 0) return;
    const n = layout.slots.length;
    open((focused + by + n) % n);
  }

  /** Back to the wall. The shoe stays lit until the end. */
  function close() {
    if (!layout || focused < 0) return;
    const index = focused;
    const slot = layout.slots[index];
    const to = toGoal(restPose(layout, cssW, cssH, scrollY, detailTop));
    focused = -1;
    frameInfo = null;
    dimTarget = 0;
    lookTargetX = lookTargetY = 0;
    closerTarget = { zoom: 1, u: 0.5, v: 0.5, omega: 8 };
    if (reduced) {
      closer.zoom.x = 1;
      pose.x.x = to.x;
      pose.y.x = to.y;
      pose.logD.x = to.logD;
      pose.shiftX.x = to.shiftX;
      pose.shiftY.x = to.shiftY;
      pose.x.v = pose.y.v = pose.logD.v = pose.shiftX.v = pose.shiftY.v = 0;
      dim.x = 0;
      goal = to;
      path = null;
      for (const s of shelves) {
        s.exposure.x = lighting.shoeExposure;
        s.mip.x = 0;
        s.amount.x = 0;
        s.level.x = 0;
      }
      options.onHome?.();
      wake();
      return;
    }
    const cx = slot.card.x + slot.card.w / 2;
    const cy = slot.slab.y - slot.card.h * 0.4;
    shelves[index].levelTarget = 1;
    startPath({
      t0: now(),
      delay: 40,
      duration: 800,
      at: anchoredPath(cx, cy, to, backEase, -6, 0),
      mark: {
        u: 0.82,
        done: false,
        run: () => {
          shelves[index].levelTarget = 0;
          options.onHome?.();
        },
      },
    });
  }

  /** The pointer, in CSS pixels. The torch follows it. In focus it also moves the camera a little. */
  function pointer(x: number, y: number) {
    if (!layout) return;
    const g = currentGoal();
    const f = focalLength(cssW);
    const k = f / (SHOE_Z + Math.exp(g.logD));
    torchTargetX = g.x + (x - cssW / 2 - (g.shiftX * cssW) / 2) / k;
    torchTargetY = g.y + (y - cssH / 2 + (g.shiftY * cssH) / 2) / k;
    torchTargetOn = hasTorch ? 1 : 0;
    if (focused >= 0) {
      lookTargetX = Math.max(-1, Math.min(1, (x / cssW) * 2 - 1));
      lookTargetY = Math.max(-1, Math.min(1, (y / cssH) * 2 - 1));
    }
    wake();
  }

  function pointerLeft() {
    torchTargetOn = 0;
    lookTargetX = lookTargetY = 0;
    wake();
  }

  /** On a phone the page's own scrolling carries the camera down the wall. Nothing is hijacked. */
  function setScroll(y: number) {
    scrollY = y;
    if (focused >= 0 || !layout || cssW >= TALL_WIDTH) return;
    const g = toGoal(restPose(layout, cssW, cssH, y, detailTop));
    if (!path) {
      goal = g;
      // The page has already moved: the room moves with it in the same frame, with no spring behind it.
      pose.y.x = g.y;
      pose.y.v = 0;
      wake();
    }
  }

  /** The strip brightens once: an answer to a click that needs one. */
  function pulse(index: number) {
    if (!shelves[index]) return;
    shelves[index].pulse.x = 1;
    wake();
  }

  /** The bag opens or closes: the world steps back with it. */
  function setBag(open: boolean) {
    bagTarget = open ? 1 : 0;
    wake();
  }

  /** Closer on the shoe in focus: u and v are where on its card, zoom is how close. Zoom 1 is the full view. */
  function closerLook(zoom: number, u = 0.5, v = 0.5, omega = 7) {
    closerTarget = { zoom, u, v, omega };
    wake();
  }

  /** Where the focused shoe stands on screen at its full view: for placing the title and the views. */
  function focusBox(index: number) {
    if (!layout) return null;
    const slot = layout.slots[index];
    const frame = focusFrame(slot, cssW, cssH, rtl, detailTop);
    const g = toGoal(frame.pose);
    const [x0, y0] = screenOf(slot.card.x, slot.card.y, g);
    const [x1, y1] = screenOf(slot.card.x + slot.card.w, slot.slab.y, g);
    return { x0, y0, x1, y1, panelLeft: frame.panelLeft * cssW };
  }

  /** The screen rectangle of a shelf, through the present camera: for hit tests and for placing real links. */
  function shelfRect(index: number) {
    const slot = layout!.slots[index];
    const g = currentGoal();
    const [x0, y0] = screenOf(slot.card.x, slot.card.y, g);
    const [x1, y1] = screenOf(slot.card.x + slot.card.w, slot.slab.y + SLAB.thick + 10, g);
    return { x0, y0, x1, y1 };
  }

  function pick(x: number, y: number): number {
    if (!layout) return -1;
    for (let i = 0; i < layout.slots.length; i++) {
      const r = shelfRect(i);
      if (x >= r.x0 && x <= r.x1 && y >= r.y0 && y <= r.y1) return i;
    }
    return -1;
  }

  function advance(t: number, dtMs: number): boolean {
    const dt = Math.min(dtMs, 50) / 1000;
    let moving = false;

    if (path) {
      const u = Math.max(0, Math.min(1, (t - path.t0 - path.delay) / path.duration));
      goal = withCarry(path.at(u), t);
      if (path.mark && !path.mark.done && u >= path.mark.u) {
        path.mark.done = true;
        path.mark.run();
      }
      moving = true;
      // Stay on the path until the carried speed has died away, so that leaving it changes nothing.
      if (u >= 1 && t - carry.t0 > 1400) {
        goal = path.at(1);
        path = null;
      }
    }

    critical(pose.x, goal.x, POSE_OMEGA, dt);
    critical(pose.y, goal.y, POSE_OMEGA, dt);
    critical(pose.logD, goal.logD, POSE_OMEGA, dt);
    critical(pose.shiftX, goal.shiftX, POSE_OMEGA, dt);
    critical(pose.shiftY, goal.shiftY, POSE_OMEGA, dt);
    if (
      !settled(pose.x, goal.x, 0.01, 0.2) ||
      !settled(pose.y, goal.y, 0.01, 0.2) ||
      !settled(pose.logD, goal.logD, 0.00002, 0.001) ||
      !settled(pose.shiftX, goal.shiftX, 0.00005, 0.001) ||
      !settled(pose.shiftY, goal.shiftY, 0.00005, 0.001)
    ) {
      moving = true;
    }

    // The room dims a little after the click, not with it.
    const wantDim = dimTarget > 0 && t - focusSince < 100 ? dim.x : dimTarget;
    critical(dim, wantDim, DIM_OMEGA, dt);
    if (!settled(dim, wantDim, 0.0005, 0.002)) moving = true;

    if (Math.abs(daySpring.x - dayTarget) > 0.0005 || Math.abs(daySpring.v) > 0.002) {
      critical(daySpring, dayTarget, 8, dt);
      day = Math.max(0, Math.min(1, daySpring.x));
      lighting = lightingAt(day);
      moving = true;
    }

    critical(bag, bagTarget, bagTarget ? 9 : 11, dt);
    if (!settled(bag, bagTarget, 0.001, 0.005)) moving = true;

    critical(closer.zoom, closerTarget.zoom, closerTarget.omega, dt);
    critical(closer.u, closerTarget.u, closerTarget.omega, dt);
    critical(closer.v, closerTarget.v, closerTarget.omega, dt);
    if (
      !settled(closer.zoom, closerTarget.zoom, 0.0006, 0.004) ||
      !settled(closer.u, closerTarget.u, 0.0004, 0.002) ||
      !settled(closer.v, closerTarget.v, 0.0004, 0.002)
    ) {
      moving = true;
    }

    critical(lookX, lookTargetX, LOOK_OMEGA, dt);
    critical(lookY, lookTargetY, LOOK_OMEGA, dt);
    if (!settled(lookX, lookTargetX, 0.0008, 0.004) || !settled(lookY, lookTargetY, 0.0008, 0.004)) moving = true;

    critical(torchX, torchTargetX, TORCH_OMEGA, dt);
    critical(torchY, torchTargetY, TORCH_OMEGA, dt);
    critical(torchOn, torchTargetOn, 5, dt);
    if (torchOn.x > 0.002 || torchTargetOn > 0) {
      if (!settled(torchX, torchTargetX, 0.1, 0.8) || !settled(torchY, torchTargetY, 0.1, 0.8)) moving = true;
    }
    if (!settled(torchOn, torchTargetOn, 0.002, 0.01)) moving = true;

    if (layout) {
      const L = lighting;
      for (let i = 0; i < layout.slots.length; i++) {
        const s = shelves[i];
        const isFocus = i === focused;
        const isHover = i === hovered && focused < 0;
        if (s.pulse.x > 0.002) {
          critical(s.pulse, 0, 5.5, dt);
          moving = true;
        }
        const lit = isFocus || isHover || s.levelTarget > 0;
        const levelGoal = lit ? 1 : 0;
        if (levelGoal > s.level.x) {
          if (reduced) critical(s.level, levelGoal, 24, dt);
          else underdamped(s.level, levelGoal, 17, 0.84, dt);
        }
        else critical(s.level, levelGoal, 11, dt);
        const exposureGoal = isFocus ? 1 : dimTarget > 0 ? mix(0.3, 0.86, day) : isHover ? mix(0.98, 1, day) : L.shoeExposure;
        critical(s.exposure, exposureGoal, 7, dt);
        const mipGoal = dimTarget > 0 && !isFocus ? 1.6 : 0;
        critical(s.mip, mipGoal, 6, dt);
        const amountGoal = dimTarget > 0 && !isFocus ? 1 : 0;
        critical(s.amount, amountGoal, 7, dt);
        // The larger picture fades in once it is on the GPU, and a lost one simply never comes.
        const largeGoal = engine.largeReady(i) ? 1 : 0;
        if (largeGoal === 0) {
          s.large.x = 0;
          s.large.v = 0;
        } else {
          critical(s.large, 1, 9, dt);
          if (!settled(s.large, 1, 0.002, 0.01)) moving = true;
        }
        if (
          !settled(s.level, levelGoal, 0.0015, 0.01) ||
          !settled(s.exposure, exposureGoal, 0.001, 0.005) ||
          !settled(s.mip, mipGoal, 0.004, 0.02) ||
          !settled(s.amount, amountGoal, 0.002, 0.01)
        ) {
          moving = true;
        }
      }
    }
    // One upload step a frame, and none during a walk: the walk never waits for a picture.
    if (!path && engine.pumpUpload()) moving = true;
    return moving;
  }

  /** Larger pictures for this shoe and those next to it. Far ones are let go. */
  function preload(index: number) {
    if (!layout) return;
    const n = layout.slots.length;
    const near = (i: number, centre: number) => {
      const d = Math.abs(i - centre);
      return Math.min(d, n - d) <= 1;
    };
    const centre = focused >= 0 ? focused : index;
    const limit = options.small ? 3 : 5;
    let held = 0;
    for (let i = 0; i < n; i++) if (engine.largeReady(i)) held++;
    if (held >= limit) engine.keepLarge((i) => near(i, centre) || near(i, index));
    for (const k of [index, (index + 1) % n, (index - 1 + n) % n]) {
      void engine.requestLarge(k).then((arrived) => {
        if (arrived) wake();
      });
    }
  }

  function buildState(): RoomState {
    const d = dim.x;
    const g = currentGoal();
    const p = toPose(g);
    // Looking around in focus: the camera slides and a lens shift holds the shoe still, so only the wall and slab
    // move behind it. The photograph is never seen at an angle it does not have.
    const dist = Math.exp(g.logD);
    const f = focalLength(cssW);
    const k = f / dist;
    const reach = Math.tan((LOOK_DEGREES * Math.PI) / 180) * dist * d;

    // Closer on the shoe: the same card, scaled about a chosen point. The camera comes forward; nothing is enlarged
    // beyond what the picture holds, because the caller sets the limit per shoe.
    if (closer.zoom.x > 1.0005 && focused >= 0 && layout) {
      const card = layout.slots[focused].card;
      const zoom = closer.zoom.x;
      const px = card.x + closer.u.x * card.w;
      const py = card.y + closer.v.x * card.h;
      const centreX = card.x + card.w / 2;
      const centreY = layout.slots[focused].slab.y - card.h * 0.42;
      const [sx, sy] = screenOf(centreX, centreY, g);
      const dist1 = dist / zoom;
      const k1 = f / dist1;
      p.z = SHOE_Z + dist1;
      p.x = px - (sx - cssW / 2 - (p.shiftX * cssW) / 2) / k1;
      p.y = py - (sy - cssH / 2 + (p.shiftY * cssH) / 2) / k1;
    }
    const dx = lookX.x * reach;
    const dy = lookY.x * reach * 0.6;
    p.x += dx;
    p.shiftX += (dx * k * 2) / cssW;
    p.y += dy;
    p.shiftY -= (dy * k * 2) / cssH;

    for (let i = 0; i < shelves.length; i++) {
      const s = shelves[i];
      const st = shoeStates[i];
      st.level = Math.max(0, s.level.x) + s.pulse.x * 0.75;
      st.exposure = s.exposure.x;
      st.mipBias = Math.max(0, s.mip.x) + bag.x * 2.6;
      st.panelAmount = Math.max(0, Math.min(1, s.amount.x));
      st.fade = 1;
      st.largeMix = Math.min(1, Math.max(0, s.large.x));
    }
    return {
      lighting,
      pose: p,
      shoes: shoeStates,
      panelFade,
      ambientScale: mix(1, mix(0.74, 1.72, day), d),
      keyScale: mix(1, mix(0.07, 0.12, day), d),
      reliefScale: 1,
      mapBias: 1.1 * d + bag.x * 2.0,
      worldDim: mix(1, mix(0.42, 0.78, day), bag.x),
      detailScale: mix(1, 4.5, d),
      torch: { x: torchX.x, y: torchY.x, power: lighting.torchPower * Math.max(0, torchOn.x) * mix(1, 0.7, d) },
    };
  }

  function render(t: number, dtMs: number, moving: boolean) {
    if (!layout) return;
    const state = buildState();
    drawnThisFrame = engine.frame(layout, cssW, cssH, dpr, state, stillIndex);
    options.onFrame?.({ t, dt: dtMs, pose: state.pose, drawCalls: drawnThisFrame, still: stillIndex, moving });
  }

  function step1(t: number) {
    const dtMs = lastT ? t - lastT : 16.7;
    lastT = t;
    // A hidden tab or a long stall pauses the walk. It carries on from where it was, rather than jumping ahead.
    if (dtMs > 120) {
      const paused = dtMs - 16.7;
      if (path) path.t0 += paused;
      carry.t0 += paused;
    }
    const moving = advance(t, dtMs);
    if (moving) {
      forced = false;
      stillIndex = -1;
      render(t, dtMs, true);
      return true;
    }
    // At rest: build one still over a few frames, then draw nothing at all.
    if (forced || stillIndex < 0) {
      forced = false;
      stillIndex = 0;
    }
    if (stillIndex < STILL_FRAMES) {
      render(t, dtMs, false);
      stillIndex++;
      return true;
    }
    return false;
  }

  function tick(t: number) {
    scheduled = false;
    if (paused) return;
    if (step1(t)) schedule();
    else lastT = 0; // the next wake starts a fresh clock: no huge first step
  }

  /**
   * A worker's animation frames keep coming in a hidden tab, so the page says when it is hidden. The next frame after
   * coming back looks like a long gap, and a long gap pauses the walk rather than jumping it.
   */
  function setVisible(visible: boolean) {
    paused = !visible;
    if (visible) schedule();
  }

  /** The context has gone: stop asking it for anything. */
  function stop() {
    manual = true;
  }

  return {
    preload,
    setVisible,
    stop,
    setLayout,
    setTheme,
    hover,
    open,
    close,
    step,
    pointer,
    pointerLeft,
    pick,
    shelfRect,
    get focused() {
      return focused;
    },
    /** Something outside changed, such as a larger texture arriving: draw again. */
    wake,
    setScroll,
    pulse,
    setBag,
    closerLook,
    focusBox,
    levels() {
      return shelves.map((s) => s.level.x);
    },
    /** For frame-by-frame proofs: stop the loop and advance by hand. */
    manualStep(t: number) {
      manual = true;
      return step1(t);
    },
  };
}

export type Room = ReturnType<typeof createRoom>;
