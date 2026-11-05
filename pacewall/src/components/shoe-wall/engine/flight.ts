/**
 * One flight for every rearrangement, on the Web Animations API.
 *
 * Rules kept here: transform and opacity only; px, never % or container units; will-change only
 * while a shoe flies; React commits the new order once, at the start, and never during a flight.
 * Each shoe's path is sampled into keyframes, so an arc, a critically damped landing and a
 * retarget from mid-air are all plain data.
 */

export type MoveKind = "shuffle" | "sort" | "filter" | "density" | "restore";

export type MoveOptions = {
  kind: MoveKind;
  /** The control that started it: the stagger spreads out from here. */
  origin?: Element | null;
  commit: () => void;
  /** Runs when every shoe has landed. */
  onSettled?: () => void;
  /** Called for each landing, for the sound. */
  onLand?: () => void;
};

type Pose = { x: number; y: number; width: number };

type Flying = {
  animations: Animation[];
  fly: HTMLElement;
  /** On its shelf, and waiting for the rest of the move to land. */
  landed?: boolean;
};

/**
 * Where to sample a flight, as shares of its time. Most keyframes go where the path bends and the
 * landing eases: the browser parses every one in the click's own frame, 18 shoes at a time.
 */
const SAMPLE_AT = [0, 0.04, 0.09, 0.15, 0.22, 0.3, 0.38, 0.46, 0.52, 0.58, 0.64, 0.7, 0.76, 0.82, 0.845, 0.87, 0.9, 0.93, 0.965, 1];
const MAX_FLIERS = 24;
const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));
const easeOut = (t: number) => 1 - (1 - t) ** 3;
const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);

/** From rest at 1 to exactly 0, with no overshoot: it never passes below the shelf. */
const OMEGA = 6;
const RESIDUE = (1 + OMEGA) * Math.exp(-OMEGA);
const damped = (v: number) => ((1 + OMEGA * v) * Math.exp(-OMEGA * v) - RESIDUE) / (1 - RESIDUE);

export function flightDuration(distance: number): number {
  return clamp(420 + 0.18 * distance, 480, 760);
}

type PathInput = {
  dx: number;
  dy: number;
  scale: number;
  lift: boolean;
  jitter: number;
};

/** Where the shoe is at t in 0..1, relative to where it lands. */
export function pathAt(t: number, p: PathInput): { x: number; y: number; s: number } {
  const distance = Math.hypot(p.dx, p.dy);
  const arc = clamp(0.18 * distance, 24, 96) * (1 + p.jitter * 0.18);
  const liftEnd = p.lift ? 0.22 : 0;
  const travelEnd = p.lift ? 0.82 : 0.8;
  const startY = p.lift ? p.dy - 18 : p.dy;
  const liftScale = p.lift ? p.scale * 1.05 : p.scale;

  if (t < liftEnd) {
    const e = easeOut(t / liftEnd);
    return { x: p.dx, y: p.dy - 18 * e, s: p.scale * (1 + 0.05 * e) };
  }
  if (t < travelEnd) {
    const u = easeInOut((t - liftEnd) / (travelEnd - liftEnd));
    const midX = p.dx / 2;
    const midY = (startY - 12) / 2 - arc;
    const a = (1 - u) ** 2;
    const b = 2 * u * (1 - u);
    const c = u ** 2;
    return {
      x: a * p.dx + b * midX,
      y: a * startY + b * midY + c * -12,
      s: liftScale + (1.03 - liftScale) * u,
    };
  }
  const v = damped((t - travelEnd) / (1 - travelEnd));
  return { x: 0, y: -12 * v, s: 1 + 0.03 * v };
}

function framesFor(p: PathInput): Keyframe[] {
  return SAMPLE_AT.map((at) => {
    const { x, y, s } = pathAt(at, p);
    return {
      offset: at,
      transform: at === 1 ? "translate3d(0px, 0px, 0px) scale(1)" : `translate3d(${x.toFixed(2)}px, ${y.toFixed(2)}px, 0px) scale(${s.toFixed(4)})`,
    };
  });
}

function readMatrix(el: HTMLElement): { e: number; f: number; a: number } {
  const value = getComputedStyle(el).transform;
  if (!value || value === "none") return { e: 0, f: 0, a: 1 };
  const m = new DOMMatrixReadOnly(value);
  return { e: m.e, f: m.f, a: m.a };
}

export class WallEngine {
  private flying = new Map<string, Flying>();
  private layer: HTMLElement | null = null;
  private runId = 0;

  constructor(
    private box: () => HTMLElement | null,
    private reduced: () => boolean,
  ) {}

  private wall(): HTMLElement | null {
    return this.box()?.querySelector<HTMLElement>(".pw-wall") ?? null;
  }

  private slots(): HTMLElement[] {
    const wall = this.wall();
    return wall ? [...wall.querySelectorAll<HTMLElement>(":scope > .pw-slot")] : [];
  }

  /** Where each shoe is now: its place in the layout plus whatever its flight has added. */
  private poses(read: boolean): Map<string, Pose> {
    const out = new Map<string, Pose>();
    for (const slot of this.slots()) {
      const fly = slot.querySelector<HTMLElement>(".pw-fly");
      const stage = fly?.parentElement;
      if (!fly || !stage) continue;
      const rect = stage.getBoundingClientRect();
      const m = read && this.flying.has(slot.dataset.id as string) ? readMatrix(fly) : { e: 0, f: 0, a: 1 };
      out.set(slot.dataset.id as string, {
        x: rect.left + rect.width / 2 + m.e,
        y: rect.bottom + m.f,
        width: rect.width * m.a,
      });
    }
    return out;
  }

  private overlay(): HTMLElement | null {
    const box = this.box();
    if (!box) return null;
    if (!this.layer || !this.layer.isConnected) {
      this.layer = document.createElement("div");
      this.layer.className = "pw-overlay";
      this.layer.setAttribute("aria-hidden", "true");
      box.appendChild(this.layer);
    }
    return this.layer;
  }

  /** Copies of what is about to change, fading out where they are: a ticket never just vanishes. */
  private fadeCopies(selector: string, duration: number) {
    const box = this.box();
    const layer = this.overlay();
    if (!box || !layer) return;
    const origin = box.getBoundingClientRect();
    const top = window.innerHeight * -0.2;
    const bottom = window.innerHeight * 1.2;
    for (const slot of this.slots()) {
      const source = slot.querySelector<HTMLElement>(selector);
      if (!source) continue;
      const rect = source.getBoundingClientRect();
      if (rect.bottom < top || rect.top > bottom) continue;
      const copy = source.cloneNode(true) as HTMLElement;
      copy.style.cssText = `position:absolute;left:${rect.left - origin.left}px;top:${rect.top - origin.top}px;width:${rect.width}px;margin:0;`;
      layer.appendChild(copy);
      const fade = copy.animate([{ opacity: 1 }, { opacity: 0 }], { duration, easing: "ease-out", fill: "both" });
      fade.onfinish = () => copy.remove();
      fade.oncancel = () => copy.remove();
    }
  }

  /** A shoe that leaves the wall: its copy rises a little and fades where it stood. */
  private leaving(gone: { fly: HTMLElement; pose: Pose }[]) {
    const box = this.box();
    const layer = this.overlay();
    if (!box || !layer) return;
    const origin = box.getBoundingClientRect();
    for (const { fly, pose } of gone) {
      const copy = fly.cloneNode(true) as HTMLElement;
      const rectHeight = fly.getBoundingClientRect().height;
      copy.style.cssText = `position:absolute;left:${pose.x - pose.width / 2 - origin.left}px;top:${pose.y - rectHeight - origin.top}px;width:${pose.width}px;bottom:auto;right:auto;`;
      layer.appendChild(copy);
      const anim = copy.animate(
        [
          { transform: "translate3d(0,0,0) scale(1)", opacity: 1 },
          { transform: "translate3d(0,-18px,0) scale(1.03)", opacity: 0 },
        ],
        { duration: 240, easing: "cubic-bezier(0.3,0,0.6,1)", fill: "both" },
      );
      anim.onfinish = () => copy.remove();
      anim.oncancel = () => copy.remove();
    }
  }

  /** Read the shoes in the air and let go of their animations, so the commit starts from a clean slate. */
  private release() {
    for (const { animations, fly } of this.flying.values()) {
      for (const a of animations) {
        a.onfinish = null;
        a.cancel();
      }
      fly.style.willChange = "";
    }
    const parents = new Set<HTMLElement>();
    for (const { fly } of this.flying.values()) {
      const li = fly.closest<HTMLElement>(".pw-slot");
      if (li) parents.add(li);
    }
    for (const li of parents) li.style.zIndex = "";
    this.flying.clear();
  }

  move({ kind, origin, commit, onSettled, onLand }: MoveOptions) {
    const box = this.box();
    if (!box) {
      commit();
      return;
    }
    const id = ++this.runId;

    if (this.reduced()) {
      this.release();
      commit();
      const wall = this.wall();
      const fade = wall?.animate([{ opacity: 0.001 }, { opacity: 1 }], { duration: 180, easing: "ease-out" });
      if (fade) fade.onfinish = () => onSettled?.();
      else onSettled?.();
      return;
    }

    const wasAirborne = new Set([...this.flying].filter(([, f]) => !f.landed).map(([shoe]) => shoe));
    const first = this.poses(true);
    const previousShoes = new Map(this.slots().map((s) => [s.dataset.id as string, s.querySelector<HTMLElement>(".pw-fly") as HTMLElement]));
    const beforeHeight = box.offsetHeight;
    const boxRect = box.getBoundingClientRect();
    const bottomInView = boxRect.bottom < window.innerHeight + 40;

    // After a density change the shoe nearest the middle of the view stays in view.
    let anchorId: string | null = null;
    let anchorY = 0;
    if (kind === "density") {
      let best = Infinity;
      for (const [shoe, pose] of first) {
        const d = Math.abs(pose.y - window.innerHeight / 2);
        if (d < best) {
          best = d;
          anchorId = shoe;
          anchorY = pose.y;
        }
      }
    }

    this.fadeCopies(kind === "density" ? ".pw-under" : ".pw-ticket", kind === "density" ? 200 : 130);
    this.release();

    // The one and only React commit of this move.
    commit();

    if (anchorId) {
      const pose = this.poses(false).get(anchorId);
      if (pose) {
        // Everything measured before the scroll keeps its place on screen, so it needs no change.
        window.scrollBy({ top: pose.y - anchorY, behavior: "instant" as ScrollBehavior });
      }
    }

    const slots = this.slots();
    const last = this.poses(false);
    const height = window.innerHeight;

    // Those no longer on the wall leave from where they stood.
    const gone: { fly: HTMLElement; pose: Pose }[] = [];
    for (const [shoe, pose] of first) {
      if (!last.has(shoe) && pose.y > -200 && pose.y < height + 200) {
        const fly = previousShoes.get(shoe);
        if (fly) gone.push({ fly, pose });
      }
    }
    this.leaving(gone);

    // The stagger spreads out from the control that started the move.
    const anchor = origin?.getBoundingClientRect();
    const ox = anchor ? anchor.left + anchor.width / 2 : window.innerWidth / 2;
    const oy = anchor ? anchor.top + anchor.height / 2 : 0;
    const reach = Math.hypot(window.innerWidth, height) || 1;

    // The section's height, once, with the same timing, only if its bottom edge is in view.
    const afterHeight = box.offsetHeight;
    if (Math.abs(afterHeight - beforeHeight) > 1 && bottomInView) {
      box.animate([{ height: `${beforeHeight}px` }, { height: `${afterHeight}px` }], {
        duration: 620,
        easing: "cubic-bezier(0.3,0.1,0.25,1)",
      });
    }

    // Who flies, nearest the middle of the view first, up to the limit.
    type Plan = { slot: HTMLElement; shoe: string; from?: Pose; to: Pose };
    const plans: Plan[] = [];
    for (const slot of slots) {
      const shoe = slot.dataset.id as string;
      const to = last.get(shoe);
      if (to) plans.push({ slot, shoe, from: first.get(shoe), to });
    }
    const onScreen = (p: Pose) => p.y > -60 && p.y - p.width < height + 60;
    plans.sort((a, b) => Math.abs(a.to.y - height / 2) - Math.abs(b.to.y - height / 2));

    let fliers = 0;
    let pending = 0;
    let settled = false;
    let landedSoFar = 0;
    const finishOne = () => {
      pending--;
      if (pending <= 0 && !settled && id === this.runId) {
        settled = true;
        this.clearLanded();
        onSettled?.();
      }
    };

    plans.forEach((plan, order) => {
      const { slot, shoe, from, to } = plan;
      const fly = slot.querySelector<HTMLElement>(".pw-fly") as HTMLElement;
      const contact = slot.querySelector<HTMLElement>(".pw-contact");
      const wallShadow = slot.querySelector<HTMLElement>(".pw-wallshadow");
      const ticket = slot.querySelector<HTMLElement>(".pw-ticket");
      const shelf = slot.querySelector<HTMLElement>(".pw-shelf");
      const animations: Animation[] = [];

      const toVisible = onScreen(to);
      const fromVisible = from ? onScreen(from) : false;

      // Off-screen at both ends: it simply jumps.
      if (!from ? !toVisible : !toVisible && !fromVisible) return;

      const distanceToControl = Math.hypot(to.x - ox, to.y - oy);
      const maxStagger = kind === "density" ? 110 : 220;
      const delay = Math.round(clamp((distanceToControl / reach) * 2, 0, 1) * maxStagger);

      // A new shoe on the wall comes down onto its shelf.
      if (!from) {
        const duration = 420;
        const anim = fly.animate(
          [
            { transform: "translate3d(0,-18px,0) scale(1.02)", opacity: 0 },
            { transform: "translate3d(0,-10px,0) scale(1.01)", opacity: 1, offset: 0.55 },
            { transform: "translate3d(0,0,0) scale(1)", opacity: 1 },
          ],
          { duration, delay: delay + 120, easing: "cubic-bezier(0.25,0.7,0.3,1)", fill: "both" },
        );
        animations.push(anim);
        if (ticket) {
          animations.push(ticket.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 200, delay: delay + 340, fill: "both" }));
        }
        this.track(shoe, fly, animations, finishOne);
        pending++;
        return;
      }

      const dx = from.x - to.x;
      const dy = from.y - to.y;
      const scale = from.width / to.width;
      const distance = Math.hypot(dx, dy);
      const still = distance < 0.5 && Math.abs(scale - 1) < 0.002;
      if (still && !wasAirborne.has(shoe)) return;

      fliers++;
      // Past the limit, or crossing the page edge: a short fade instead of a long trip.
      const crossing = toVisible !== fromVisible;
      if (fliers > MAX_FLIERS) {
        animations.push(fly.animate([{ opacity: 0.001 }, { opacity: 1 }], { duration: 220, delay, fill: "both" }));
        if (ticket) animations.push(ticket.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 200, delay: delay + 120, fill: "both" }));
        this.track(shoe, fly, animations, finishOne);
        pending++;
        return;
      }

      if (crossing) {
        const limit = 200;
        const k = distance > limit ? limit / distance : 1;
        const startX = toVisible ? dx * k : 0;
        const startY = toVisible ? dy * k : 0;
        const a = fly.animate(
          toVisible
            ? [
                { transform: `translate3d(${startX}px,${startY}px,0)`, opacity: 0 },
                { transform: "translate3d(0px,0px,0)", opacity: 1 },
              ]
            : [
                { transform: `translate3d(${dx}px,${dy}px,0) scale(${scale})`, opacity: 1 },
                { transform: `translate3d(${dx * (1 - k)}px,${dy * (1 - k)}px,0) scale(${scale})`, opacity: 0 },
              ],
          { duration: 360, delay, easing: "cubic-bezier(0.3,0.1,0.25,1)", fill: toVisible ? "both" : "backwards" },
        );
        animations.push(a);
        if (ticket && toVisible) {
          animations.push(ticket.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 200, delay: delay + 260, fill: "both" }));
        }
        this.track(shoe, fly, animations, finishOne);
        pending++;
        return;
      }

      const airborne = wasAirborne.has(shoe);
      const duration = airborne ? clamp(flightDuration(distance) * 0.85, 320, 760) : flightDuration(distance);
      const jitter = ((order * 2654435761) >>> 0) / 4294967296 - 0.5;

      fly.style.willChange = "transform";
      // Later landers sit above earlier ones. The order is the landing order.
      const landsAt = delay + duration;
      slot.style.zIndex = String(10 + Math.round(landsAt / 10));

      animations.push(
        fly.animate(framesFor({ dx, dy, scale, lift: !airborne, jitter }), {
          duration,
          delay: airborne ? 0 : delay,
          easing: "linear",
          fill: "both",
        }),
      );
      const start = airborne ? 0 : delay;
      if (contact) {
        const startOpacity = airborne ? 0 : 1;
        animations.push(
          contact.animate(
            [
              { opacity: startOpacity },
              { opacity: 0, offset: 0.14 },
              { opacity: 0, offset: 0.92 },
              { opacity: 1 },
            ],
            { duration, delay: start, easing: "linear", fill: "both" },
          ),
        );
      }
      if (wallShadow) {
        animations.push(
          wallShadow.animate(
            [
              { opacity: airborne ? 1 : 0.001 },
              { opacity: 1, offset: 0.22 },
              { opacity: 1, offset: 0.82 },
              { opacity: 0.001 },
            ],
            { duration, delay: start, easing: "linear", fill: "both" },
          ),
        );
      }
      if (ticket) {
        animations.push(
          ticket.animate(
            [{ opacity: 0 }, { opacity: 0, offset: 0.86 }, { opacity: 1 }],
            { duration: duration + 90, delay: start, easing: "linear", fill: "both" },
          ),
        );
      }
      if (shelf && kind !== "density") {
        // At contact the shelf gives by a pixel and recovers.
        animations.push(
          shelf.animate(
            [{ transform: "translateY(0px)" }, { transform: "translateY(1px)", offset: 0.35 }, { transform: "translateY(0px)" }],
            { duration: 170, delay: start + duration * 0.92, easing: "ease-out", fill: "both" },
          ),
        );
      }
      if (shelf && kind === "density") {
        // The new shelf arrives while the shoes are in the air.
        const at = start + duration * 0.18;
        animations.push(
          shelf.animate(
            [
              { opacity: 0, transform: "scaleX(0.72)" },
              { opacity: 1, transform: "scaleX(1)" },
            ],
            { duration: duration * 0.5, delay: at, easing: "cubic-bezier(0.2,0.8,0.3,1)", fill: "backwards" },
          ),
        );
      }

      if (onLand) {
        window.setTimeout(() => {
          if (id === this.runId && landedSoFar++ < 6) onLand();
        }, start + duration * 0.86);
      }

      this.track(shoe, fly, animations, finishOne);
      pending++;
    });

    // The shelves with no shoe at the end of the wall follow the new layout softly.
    const wall = this.wall();
    if (wall) {
      for (const ghost of wall.querySelectorAll<HTMLElement>(":scope > .pw-ghost")) {
        if (getComputedStyle(ghost).display !== "none") {
          ghost.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 300, delay: 220, easing: "ease-out", fill: "backwards" });
        }
      }
    }

    if (pending === 0 && !settled) {
      settled = true;
      onSettled?.();
    }
  }

  private track(shoe: string, fly: HTMLElement, animations: Animation[], done: () => void) {
    const entry: Flying = { animations, fly };
    this.flying.set(shoe, entry);
    let left = animations.length;
    const finishAll = () => {
      left--;
      if (left > 0) return;
      // It stays as it is until the rest are down. Letting go of its layer here would repaint mid-flight.
      entry.landed = true;
      done();
    };
    for (const a of animations) a.onfinish = finishAll;
  }

  /** Everyone is down: every shoe lets go of its layer in one go. */
  private clearLanded() {
    for (const { animations, fly } of this.flying.values()) {
      for (const a of animations) {
        a.onfinish = null;
        a.cancel();
      }
      fly.style.willChange = "";
      const li = fly.closest<HTMLElement>(".pw-slot");
      if (li) li.style.zIndex = "";
    }
    this.flying.clear();
  }
}
