import type { ReactNode } from "react";

export type ShoePhoto = {
  src: string;
  srcSet?: string;
  avifSrcSet?: string;
  width: number;
  height: number;
  /** 0..1 from the top: where the sole meets the shelf. */
  baseline: number;
  /** 0..1: the part of the sole touching the shelf. */
  contact: [number, number];
  lqip?: string;
  alt: string;
};

export type ShoeView =
  | { kind: "focus"; label: string; x: number; y: number; zoom: number }
  | { kind: "photo"; label: string; photo: ShoePhoto };

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
  category: string;
  price: number;
  compareAtPrice?: number;
  currency: string;
  isNew?: boolean;
  addedAt?: string;
  photo: ShoePhoto;
  views?: ShoeView[];
  /** For the colour sort. */
  hue?: number;
  lightness?: number;
  sizes: ShoeSize[];
  description?: string;
  returnsNote?: string;
  details?: { title: string; body: string }[];
};

export type ShoeSort = "featured" | "newest" | "price-asc" | "price-desc" | "colour";
export type ShoeDensity = "l" | "m" | "s";

export type ShoeWallLabels = {
  eyebrow: string;
  heading: string;
  pairs: (count: number) => string;
  sortLabel: string;
  sortNames: Record<ShoeSort, string>;
  allCategories: string;
  yourSize: string;
  anySize: string;
  clearSize: string;
  densityLabel: string;
  densityNames: Record<ShoeDensity, string>;
  shuffle: string;
  originalOrder: string;
  sound: string;
  filter: string;
  filterDone: string;
  seeAll: (count?: number) => string;
  soldOut: string;
  newShoe: string;
  wasPrice: string;
  emptyTitle: string;
  emptyBody: string;
  emptyClear: string;
  noShoesTitle: string;
  noShoesBody: string;
  announceShuffled: (count: number) => string;
  announceSorted: (count: number, sort: string) => string;
  announceFiltered: (count: number) => string;
  announceDensity: (name: string) => string;
  announceAdded: (name: string, size: string) => string;
  announceOpened: (name: string) => string;
  back: string;
  previous: string;
  next: string;
  close: string;
  size: string;
  sizeEcho: (system: string, size: string) => string;
  sizeSystem: string;
  sizeGuide: string;
  onlyLeft: (count: number) => string;
  chooseSizeHint: string;
  chooseSize: string;
  addToBag: string;
  adding: string;
  inBag: string;
  addAnother: string;
  addFailed: string;
  addFailedReason: string;
  soldOutButton: string;
  viewBag: string;
  viewFullDetails: string;
  zoomIn: string;
  zoomOut: string;
  views: string;
  bagTitle: string;
  bagEmpty: string;
  bagRemove: (name: string) => string;
  bagQuantity: string;
  bagSubtotal: string;
  bagCheckout: string;
  bagClose: string;
};

export type RenderImageProps = {
  src: string;
  srcSet?: string;
  sizes?: string;
  alt: string;
  width: number;
  height: number;
  className?: string;
  loading?: "eager" | "lazy";
  fetchPriority?: "high" | "auto" | "low";
  decoding?: "async" | "sync" | "auto";
  draggable?: boolean;
  onLoad?: React.ReactEventHandler<HTMLImageElement>;
  onError?: React.ReactEventHandler<HTMLImageElement>;
};

export type RenderLinkProps = {
  href: string;
  className?: string;
  children: ReactNode;
  onClick?: React.MouseEventHandler<HTMLAnchorElement>;
  onPointerEnter?: React.PointerEventHandler<HTMLAnchorElement>;
  onPointerLeave?: React.PointerEventHandler<HTMLAnchorElement>;
  onFocus?: React.FocusEventHandler<HTMLAnchorElement>;
  onBlur?: React.FocusEventHandler<HTMLAnchorElement>;
};

export type ShoeWallProps = {
  shoes: Shoe[];
  density?: ShoeDensity;
  defaultDensity?: ShoeDensity;
  onDensityChange?: (d: ShoeDensity) => void;
  sort?: ShoeSort;
  defaultSort?: ShoeSort;
  onSortChange?: (s: ShoeSort) => void;
  openSlug?: string | null;
  defaultOpenSlug?: string | null;
  onOpenChange?: (slug: string | null) => void;
  syncUrl?: boolean | { param: string };
  theme?: "auto" | "light" | "dark";
  shelf?: "auto" | "alloy" | "steel" | "line";
  /** The wall's heading: 1 when it is the page's title. Default 2, for a section of a page. */
  headingLevel?: 1 | 2 | 3;
  /** False hides categories, your size and the phone's Filter button: for a small shop. Default true. */
  filters?: boolean;
  sound?: boolean;
  pointerLight?: boolean;
  moreHref?: string;
  totalCount?: number;
  stickyTop?: number;
  detailTop?: number;
  bagCount?: number;
  bagAnchor?: () => HTMLElement | null;
  onAddToBag?: (shoe: Shoe, size: ShoeSize) => void | Promise<void>;
  onViewBag?: () => void;
  onSizeGuide?: (shoe: Shoe) => void;
  labels?: Partial<ShoeWallLabels>;
  formatPrice?: (amount: number, currency: string) => string;
  dir?: "ltr" | "rtl";
  seed?: number;
  renderImage?: (p: RenderImageProps) => ReactNode;
  renderLink?: (p: RenderLinkProps) => ReactNode;
  className?: string;
};
