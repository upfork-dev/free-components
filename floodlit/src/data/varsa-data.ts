// The demo store's range. Varsa and its models are invented. Nothing here is for sale.
// The pictures are part real photographs, part AI-generated: see PHOTOS.md. None of them is covered by MIT.
import { shoePhotos } from "./photos";
import type { Shoe, ShoeSize, ShoeView } from "@/components/floodlit/types";

const photo = (id: string) => shoePhotos.find((p) => p.id === id)!;

/** EU, US, UK from data, never computed. Stock varies: some sold out, some nearly. */
function sizes(stock: Record<string, number>): ShoeSize[] {
  const table: [string, string, string][] = [
    ["39", "6.5", "6"], ["40", "7", "6.5"], ["40.5", "7.5", "7"], ["41", "8", "7.5"], ["42", "8.5", "8"],
    ["42.5", "9", "8.5"], ["43", "9.5", "9"], ["44", "10", "9.5"], ["44.5", "10.5", "10"], ["45", "11", "10.5"],
  ];
  return table.map(([eu, us, uk]) => ({ eu, us, uk, stock: stock[eu] ?? 8 }));
}

type Row = {
  id: string;
  name: string;
  series: string;
  colourName: string;
  price: number;
  compareAtPrice?: number;
  description: string;
  stock: Record<string, number>;
  /** How close the picture lets the zoom go. Real and sharp 1.8; real but compressed 1.3; AI none or very low. */
  maxZoom: number;
  views?: ShoeView[];
  alt: string;
};

const FULL: ShoeView = { label: "Side", x: 0.5, y: 0.5, zoom: 1 };

// The wall's order, in rows of 5. The court shoe was shot from below, so it stands in the top row.
const ROWS: Row[] = [
  { id: "neon-racer", name: "Quenra race shoe", series: "Road racing", colourName: "Signal yellow", price: 172, description: "A tall, light foam for the fast days, under a thin mesh upper.", stock: { "39": 0, "44.5": 2 }, maxZoom: 1.15, alt: "Yellow racing shoe with a tall white foam sole" },
  { id: "court-panel", name: "Presk court trainer", series: "Court", colourName: "White and gloss black", price: 139, description: "Leather panels and a broad flat sole that stays put when you turn.", stock: { "40": 0, "45": 1 }, maxZoom: 1.8, views: [FULL, { label: "Toe", x: 0.22, y: 0.62, zoom: 1.7 }, { label: "Laces", x: 0.46, y: 0.32, zoom: 1.7 }, { label: "Heel", x: 0.82, y: 0.55, zoom: 1.7 }], alt: "White leather court trainer with black panels" },
  { id: "red-high", name: "Korvel high-top", series: "Basketball style", colourName: "Signal red", price: 158, compareAtPrice: 184, description: "A padded collar and a strap that holds the ankle, in perforated red.", stock: { "42": 2, "39": 0, "40": 0 }, maxZoom: 1.8, views: [FULL, { label: "Toe", x: 0.22, y: 0.72, zoom: 1.7 }, { label: "Laces", x: 0.48, y: 0.38, zoom: 1.7 }, { label: "Heel", x: 0.8, y: 0.55, zoom: 1.7 }], alt: "Red perforated high-top with a white sole and an ankle strap" },
  { id: "mesh-runner", name: "Oskana road runner", series: "Road running", colourName: "Black mesh", price: 124, description: "An open mesh that breathes, and a plain white sole for easy miles.", stock: { "43": 3 }, maxZoom: 1.3, views: [FULL, { label: "Laces", x: 0.52, y: 0.32, zoom: 1.3 }], alt: "Black mesh running shoe with a white sole" },
  { id: "cobalt-runner", name: "Selvane road runner", series: "Road running", colourName: "Cobalt", price: 136, description: "One clean colour from toe to heel, on a soft rocker.", stock: { "44": 0 }, maxZoom: 1.15, alt: "Cobalt blue running shoe with a white sole" },
  { id: "white-trainer", name: "Brevik training shoe", series: "Training", colourName: "All white", price: 118, description: "A stitched upper and a wide base, for the gym floor and the walk home.", stock: { "41": 1 }, maxZoom: 1.8, views: [FULL, { label: "Toe", x: 0.2, y: 0.66, zoom: 1.7 }, { label: "Laces", x: 0.46, y: 0.32, zoom: 1.7 }, { label: "Heel", x: 0.82, y: 0.64, zoom: 1.7 }], alt: "White leather training shoe" },
  { id: "olive-trail", name: "Tarnell trail shoe", series: "Trail", colourName: "Olive and burnt orange", price: 164, description: "Deep lugs and a rubber toe guard, for ground that fights back.", stock: { "42.5": 2 }, maxZoom: 1.15, alt: "Olive green trail shoe with orange overlays and deep lugs" },
  { id: "black-lace", name: "Duskel everyday trainer", series: "Everyday", colourName: "Black", price: 142, description: "Knit and leather in one shade of black, cut to the ankle.", stock: { "44": 0, "45": 0 }, maxZoom: 1.3, views: [FULL, { label: "Laces", x: 0.46, y: 0.36, zoom: 1.3 }], alt: "All black knit and leather trainer" },
  { id: "lagoon-low", name: "Lumeo low court", series: "Basketball style", colourName: "Lagoon", price: 129, description: "A low collar, a gum sole and a shot of colour.", stock: { "39": 2 }, maxZoom: 1.15, alt: "Turquoise low court shoe with a white heel and a gum sole" },
  { id: "slate-gym", name: "Hollen gym shoe", series: "Gym", colourName: "Slate and hot pink", price: 112, description: "Flat and firm under the bar, with a rope guard at the midfoot.", stock: { "40.5": 3 }, maxZoom: 1.2, alt: "Slate grey gym shoe with a pink heel clip" },
];

export const varsaShoes: Shoe[] = ROWS.map((row) => {
  const p = photo(row.id);
  return {
    id: row.id,
    slug: row.id,
    href: `#${row.id}`,
    name: row.name,
    series: row.series,
    colourName: row.colourName,
    price: row.price,
    compareAtPrice: row.compareAtPrice,
    currency: "USD",
    description: row.description,
    ledColor: p.ledColor,
    ledInk: p.ledInk,
    sizes: sizes(row.stock),
    views: row.views,
    returnsNote: "True to size. Free returns within 30 days, unworn. Demo text: nothing here is for sale.",
    photo: {
      src: p.sizes["960"],
      srcSet: `${p.sizes["480"]} 480w, ${p.sizes["960"]} 960w`,
      large: p.sizes["2000"] ?? p.sizes.max,
      width: p.width,
      height: p.height,
      baseline: p.baseline,
      contact: p.contact,
      lqip: p.lqip,
      alt: row.alt,
      shadow: p.shadow,
      maxZoom: row.maxZoom,
    },
  };
});
