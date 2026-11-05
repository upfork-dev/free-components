// The wall's layout, from the component's own width. Shared by the canvas and the page's real links, so the
// two can never disagree. World units are CSS pixels at the rest camera; x right, y down, z towards the viewer.

export const SLAB = { depth: 46, thick: 8, zBack: 2 } as const;
export const SHOE_Z = 24;
export const MAX_SHOE_WIDTH = 340;

export type ShoeShape = {
  /** Picture width / height. */
  aspect: number;
  /** 0..1 from the top of the picture: where the sole meets the slab. */
  baseline: number;
  /** 0..1 across the picture: the part of the sole touching the slab. */
  contact: readonly [number, number];
};

export type Slot = {
  index: number;
  row: number;
  col: number;
  /** The picture's card, standing on the slab. */
  card: { x: number; y: number; w: number; h: number };
  /** The slab's top face: left, right, y. */
  slab: { x0: number; x1: number; y: number };
  strip: { x0: number; x1: number; y: number; z: number };
  contact: readonly [number, number];
  /** Where the caption starts. */
  captionY: number;
};

export type WallLayout = {
  width: number;
  height: number;
  cols: number;
  rows: number;
  slots: Slot[];
  /** How tall the wall's content is. The rest camera steps back if the window is shorter. */
  contentHeight: number;
  headerHeight: number;
  shoeWidth: number;
};

export function columnsFor(width: number, count: number): number {
  if (width >= 1100) return Math.min(Math.ceil(count / 2), 6);
  if (width >= 700) return count <= 8 ? 3 : 4;
  return 2;
}

export function layoutWall(width: number, shoes: readonly ShoeShape[], rtl = false): WallLayout {
  const cols = Math.max(1, columnsFor(width, shoes.length));
  const rows = Math.ceil(shoes.length / cols);
  const edge = Math.max(16, width * 0.04);
  const gap = Math.max(10, width * 0.012);
  const fit = (width - edge * 2 - gap * (cols - 1)) / cols;
  const shoeWidth = Math.min(fit, MAX_SHOE_WIDTH);
  const gridWidth = shoeWidth * cols + gap * (cols - 1);
  const left = (width - gridWidth) / 2;

  const headerHeight = Math.max(96, shoeWidth * 0.62);
  const tallest = shoeWidth * 0.62; // the tallest pictures stand this high above their slab
  const pitch = shoeWidth * 0.62 + SLAB.thick + shoeWidth * 0.62;
  const firstBaseline = headerHeight + tallest;

  const slots: Slot[] = shoes.map((shoe, index) => {
    const row = Math.floor(index / cols);
    const inRow = row === rows - 1 ? shoes.length - cols * (rows - 1) : cols;
    const col = index - row * cols;
    // An odd last row is centred, with the wall continuing behind it.
    const rowLeft = left + ((cols - inRow) * (shoeWidth + gap)) / 2;
    const place = rtl ? inRow - 1 - col : col;
    const cardX = rowLeft + place * (shoeWidth + gap);
    const cardH = shoeWidth / shoe.aspect;
    const baseY = firstBaseline + row * pitch;
    const slabInset = shoeWidth * 0.015;
    const x0 = cardX + slabInset;
    const x1 = cardX + shoeWidth - slabInset;
    return {
      index,
      row,
      col,
      card: { x: cardX, y: baseY - cardH * shoe.baseline, w: shoeWidth, h: cardH },
      slab: { x0, x1, y: baseY },
      strip: { x0: x0 + 9, x1: x1 - 9, y: baseY + SLAB.thick / 2, z: SLAB.zBack + SLAB.depth },
      contact: rtl
        ? [cardX + (1 - shoe.contact[1]) * shoeWidth, cardX + (1 - shoe.contact[0]) * shoeWidth]
        : [cardX + shoe.contact[0] * shoeWidth, cardX + shoe.contact[1] * shoeWidth],
      captionY: baseY + SLAB.thick + 14,
    };
  });

  const contentHeight = firstBaseline + (rows - 1) * pitch + SLAB.thick + shoeWidth * 0.34;
  return { width, height: contentHeight, cols, rows, slots, contentHeight, headerHeight, shoeWidth };
}
