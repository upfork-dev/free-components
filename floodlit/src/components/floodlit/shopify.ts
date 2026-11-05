import type { Shoe, ShoePhoto, ShoeSize } from "./types";

type Money = { amount: string; currencyCode: string };
type Variant = {
  id: string;
  quantityAvailable?: number | null;
  availableForSale?: boolean;
  price: Money;
  compareAtPrice?: Money | null;
  selectedOptions: { name: string; value: string }[];
};
type Product = {
  id: string;
  handle: string;
  title: string;
  description?: string;
  productType?: string;
  featuredImage?: { url: string; width?: number; height?: number; altText?: string | null } | null;
  variants: { edges: { node: Variant }[] } | { nodes: Variant[] };
};

export type FromShopifyOptions = {
  /** The option that holds the size. "Size" if left out. */
  sizeOption?: string;
  href?: (handle: string) => string;
  /**
   * The room needs transparent, side-view pictures. Most shops do not have them, so this is where yours come in:
   * run your photographs through scripts/photos and return the result per handle.
   */
  photo: (product: Product) => ShoePhoto;
};

/** A plain mapper from a Storefront API response to shoes. It makes no network calls. */
export function fromShopifyProducts(products: Product[], options: FromShopifyOptions): Shoe[] {
  const sizeName = (options.sizeOption ?? "Size").toLowerCase();
  return products.map((p) => {
    const variants = "nodes" in p.variants ? p.variants.nodes : p.variants.edges.map((e) => e.node);
    const sizes: ShoeSize[] = variants.map((v) => {
      const option = v.selectedOptions.find((o) => o.name.toLowerCase() === sizeName);
      const stock = v.quantityAvailable ?? (v.availableForSale === false ? 0 : 1);
      return { eu: option?.value ?? v.id, stock: Math.max(0, stock), variantId: v.id };
    });
    const first = variants[0];
    return {
      id: p.id,
      slug: p.handle,
      href: options.href ? options.href(p.handle) : `/products/${p.handle}`,
      name: p.title,
      series: p.productType,
      description: p.description,
      price: first ? Number(first.price.amount) : 0,
      compareAtPrice: first?.compareAtPrice ? Number(first.compareAtPrice.amount) : undefined,
      currency: first?.price.currencyCode ?? "USD",
      photo: options.photo(p),
      sizes,
    };
  });
}
