// One camera for the whole room. Every shelf's view comes from this one pose, which is what makes it one place.
import type { Slot, WallLayout } from "./layout";
import { SHOE_Z } from "./layout";

export type Pose = {
  x: number;
  y: number;
  z: number;
  /** Radians. Kept small: a photograph is a flat card. */
  pitch: number;
  yaw: number;
  /** Lens shift in clip units: moves the picture without turning the camera, so the shoe stays head-on. */
  shiftX: number;
  shiftY: number;
};

export function focalLength(width: number): number {
  return Math.min(1700, Math.max(900, width * 0.9));
}

/** Below this width the wall is taller than the window, and ordinary page scrolling carries the camera down it. */
export const TALL_WIDTH = 700;

/** Too narrow for a panel beside the shoe, or a tablet held upright: the shoe goes above and the panel below it. */
export function isStacked(width: number, height: number): boolean {
  return width < TALL_WIDTH || (width < 1100 && height > width * 1.1);
}

/**
 * At rest the shoes' plane is 1:1 with CSS pixels, so a poster laid out by CSS alone lands exactly where the room
 * draws the same shoe. The wall behind is a little smaller, the slab's edge a little larger, as they should be.
 */
export function restPose(layout: WallLayout, width: number, height: number, scrollY = 0, top = 0): Pose {
  const f = focalLength(width);
  if (width < TALL_WIDTH) {
    return { x: width / 2, y: scrollY + height / 2, z: f + SHOE_Z, pitch: 0, yaw: 0, shiftX: 0, shiftY: 0 };
  }
  // A short window steps back: the layout never changes by height. The host's header keeps its own strip on top.
  const room = Math.max(1, height - top);
  const stepBack = Math.max(1, layout.contentHeight / room);
  // The camera's eye sits level with the middle of the shelves, so the rows above it are seen from below
  // and the rows below it from above. A lens shift keeps the page itself where it belongs.
  const first = layout.slots[0]?.slab.y ?? 0;
  const last = layout.slots[layout.slots.length - 1]?.slab.y ?? 0;
  const eye = (first + last) / 2;
  const pageCentre = layout.contentHeight / 2;
  const screenEye = top + room / 2 + (eye - pageCentre) / stepBack;
  const shiftY = -((screenEye / height) * 2 - 1);
  return { x: width / 2, y: eye, z: f * stepBack + SHOE_Z, pitch: 0, yaw: 0, shiftX: 0, shiftY };
}

/** The share of the view the panel keeps for itself, on the side the shoe is not. */
export const PANEL_SHARE = 0.34;

/** Where the sheet starts when stacked: half the window, or only what its content needs on a tall one. */
export function sheetTop(height: number): number {
  return Math.max(height * 0.5, height - 440);
}

export type FocusFrame = {
  pose: Pose;
  /** Screen x (0..1) where the panel's calm zone begins. */
  panelLeft: number;
  /** Screen shares where a neighbour on the panel's side starts to fade and where it is gone. */
  panelFade: [number, number];
};

/**
 * Framing from the shoe's real size, not a fixed zoom. Large enough to fill the view, never cut off,
 * somewhat left of centre with room for the panel. The camera stays directly in front of the shoe and a
 * lens shift moves it left, so the shoe is seen head-on, whatever the window's shape.
 */
export function focusFrame(slot: Slot, width: number, height: number, rtl = false, top = 0): FocusFrame {
  const f = focalLength(width);
  const { card } = slot;
  if (isStacked(width, height)) {
    // The shoe in the upper part, the panel as a sheet below. Neighbours may show at the sides.
    // Clear of the host's header and the row with the back button, and above the walking buttons.
    const visible = card.h * 0.9;
    // The slab's thickness and its front edge count too: the buttons sit under the slab, not on it.
    const under = 26;
    const ceiling = Math.max(height * 0.1, top + 52);
    const floor = sheetTop(height) - 62;
    const scale = Math.min((width * 0.9) / card.w, Math.max(height * 0.2, floor - ceiling) / (visible + under));
    const spare = Math.max(0, floor - ceiling - (visible + under) * scale);
    const baseY = slot.slab.y;
    const screenY = ceiling + spare * 0.5 + visible * scale;
    const z = SHOE_Z + f / scale;
    const y = baseY - (visible * scale * 0.5) / scale;
    const screenCamY = screenY - (baseY - y) * scale;
    return {
      pose: { x: card.x + card.w / 2, y, z, pitch: 0, yaw: 0, shiftX: 0, shiftY: -((screenCamY / height) * 2 - 1) },
      panelLeft: 1,
      panelFade: [2, 3],
    };
  }
  const panel = Math.min(Math.max(340, width * PANEL_SHARE), width * 0.5);
  const roomW = width - panel;
  const visibleH = card.h * 0.9;
  // Not so large that the neighbours leave: you never leave the room.
  const scale = Math.min((roomW * 0.8) / card.w, (height * 0.78) / visibleH);
  const z = SHOE_Z + f / scale;
  const centreX = card.x + card.w / 2;
  const baseY = slot.slab.y;
  const shoeH = visibleH * scale;
  // Baseline a little below the middle: the slab and the wall under it stay in view.
  const screenY = height * 0.5 + shoeH * 0.46;
  const screenX = (rtl ? panel + roomW / 2 : roomW / 2) + (rtl ? 1 : -1) * Math.max(0, roomW * 0.02);
  // The camera's height stays just above the shoe's middle, so its angle to the shoe is near zero.
  const y = baseY - shoeH * 0.46 / scale - 6;
  const shiftX = (screenX / width) * 2 - 1;
  const screenYofCamera = screenY - (baseY - y) * scale;
  const shiftY = -((screenYofCamera / height) * 2 - 1);
  return {
    pose: { x: centreX, y, z, pitch: 0, yaw: 0, shiftX, shiftY },
    panelLeft: rtl ? panel / width : roomW / width,
    // Right after this shoe's own slab: a neighbour half faded further out reads as a smudge, not a shoe.
    panelFade: rtl
      ? [(screenX - (card.w / 2) * scale) / width - 0.012, (screenX - (card.w / 2) * scale) / width - 0.05]
      : [(screenX + (card.w / 2) * scale) / width + 0.012, (screenX + (card.w / 2) * scale) / width + 0.05],
  };
}

export type Mat4 = Float32Array;

export function viewProjection(pose: Pose, width: number, height: number, jitterX = 0, jitterY = 0): Mat4 {
  const f = focalLength(width);
  const cy = Math.cos(pose.yaw);
  const sy = Math.sin(pose.yaw);
  const cp = Math.cos(pose.pitch);
  const sp = Math.sin(pose.pitch);
  // Rotation: yaw about y, then pitch about x. Columns of the view rotation.
  const r00 = cy, r01 = 0, r02 = sy;
  const r10 = sp * sy, r11 = cp, r12 = -sp * cy;
  const r20 = -cp * sy, r21 = sp, r22 = cp * cy;
  const tx = -(r00 * pose.x + r01 * pose.y + r02 * pose.z);
  const ty = -(r10 * pose.x + r11 * pose.y + r12 * pose.z);
  const tz = -(r20 * pose.x + r21 * pose.y + r22 * pose.z);
  const fx = (2 * f) / width;
  const fy = (2 * f) / height;
  const sx = pose.shiftX + jitterX;
  const syy = pose.shiftY + jitterY;
  // clip.x = fx * vx + sx * (-vz); clip.y = -fy * vy + sy * (-vz); clip.w = -vz. World y points down.
  const m = new Float32Array(16);
  m[0] = fx * r00 - sx * r20;
  m[4] = fx * r01 - sx * r21;
  m[8] = fx * r02 - sx * r22;
  m[12] = fx * tx - sx * tz;
  m[1] = -fy * r10 - syy * r20;
  m[5] = -fy * r11 - syy * r21;
  m[9] = -fy * r12 - syy * r22;
  m[13] = -fy * ty - syy * tz;
  m[2] = 0;
  m[6] = 0;
  m[10] = 0;
  m[14] = 0;
  m[3] = -r20;
  m[7] = -r21;
  m[11] = -r22;
  m[15] = -tz;
  return m;
}
