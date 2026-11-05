import type { ReactNode } from "react";

export type ShoePhoto = {
  src: string;
  srcSet?: string;
  /** About 2000 px, for focus. */
  large: string;
  width: number;
  height: number;
  /** 0..1 from the top: where the sole meets the slab. */
  baseline: number;
  /** 0..1 across: the part of the sole touching it. */
  contact: [number, number];
  lqip?: string;
  alt: string;
  /** The blurred-alpha chain that soft shadows read. `scripts/photos` makes it. */
  shadow?: { file: string; pad: number; rects: number[][] };
  /** How close the zoom may go before the picture turns soft. 1 means no zoom. */
  maxZoom?: number;
};

export type ShoeView = { label: string; x: number; y: number; zoom: number };

export type ShoeSize = {
  eu: string;
  us?: string;
  uk?: string;
  stock: number;
  variantId?: string;
};

export type Shoe = {
  id: string;
  slug: string;
  href: string;
  name: string;
  series?: string;
  colourName?: string;
  price: number;
  compareAtPrice?: number;
  currency: string;
  photo: ShoePhoto;
  views?: ShoeView[];
  ledColor?: string;
  /** Text colour that passes contrast on ledColor. Worked out if left out. */
  ledInk?: string;
  sizes: ShoeSize[];
  description?: string;
  returnsNote?: string;
};

export type BagLine = {
  key: string;
  shoeId: string;
  name: string;
  image: string;
  sizeLabel: string;
  eu: string;
  variantId?: string;
  price: number;
  currency: string;
  ledColor: string;
  qty: number;
};

export type FloodlitLabels = {
  /** Names the whole component for screen readers. */
  room: string;
  backToWall: string;
  hint: string;
  hintTouch: string;
  chooseSize: string;
  addToBag: string;
  adding: string;
  inBag: string;
  addAnother: string;
  couldNotAdd: string;
  viewBag: string;
  size: string;
  soldOut: string;
  onlyLeft: (n: number) => string;
  yourSize: string;
  chooseSizeFirst: string;
  materialsAndFit: string;
  previous: string;
  next: string;
  nowViewing: (name: string) => string;
  addedLive: (name: string) => string;
  zoomIn: string;
  zoomOut: string;
  yourBag: string;
  bagEmpty: string;
  backToRoom: string;
  subtotal: string;
  checkout: string;
  remove: string;
  closeBag: string;
  increase: string;
  decrease: string;
  demoLine: string | null;
};

export type FloodlitProps = {
  shoes: Shoe[];
  wall?: { albedo: string; normal: string; detail?: string; noise?: string };
  theme?: "auto" | "light" | "dark";
  ledMode?: "shoe" | "brand";
  ledColor?: string;
  openSlug?: string | null;
  defaultOpenSlug?: string | null;
  onOpenChange?: (slug: string | null) => void;
  syncUrl?: boolean | { param: string };
  heading?: ReactNode;
  eyebrow?: ReactNode;
  detailTop?: number;
  bag?: BagLine[];
  bagOpen?: boolean;
  onBagOpenChange?: (open: boolean) => void;
  onAddToBag?: (shoe: Shoe, size: ShoeSize) => void | Promise<void>;
  onBagChange?: (lines: BagLine[]) => void;
  onCheckout?: () => void;
  labels?: Partial<FloodlitLabels>;
  formatPrice?: (amount: number, currency: string) => string;
  dir?: "ltr" | "rtl";
  /** False keeps the room on the page's own thread, for a host whose rules forbid workers. */
  worker?: boolean;
  className?: string;
};
