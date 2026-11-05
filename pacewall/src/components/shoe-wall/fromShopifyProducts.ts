import type { Shoe, ShoePhoto, ShoeSize } from "./types";

/** The parts of a Storefront API product this reads. Pass the nodes of your own query. */
export type ShopifyProduct = {
  id: string;
  handle: string;
  title: string;
  description?: string | null;
  productType?: string | null;
  tags?: string[] | null;
  createdAt?: string | null;
  onlineStoreUrl?: string | null;
  priceRange?: { minVariantPrice: { amount: string; currencyCode: string } } | null;
  compareAtPriceRange?: { minVariantPrice?: { amount: string; currencyCode?: string } | null } | null;
  images?: { nodes?: ShopifyImage[]; edges?: { node: ShopifyImage }[] } | null;
  variants?: { nodes?: ShopifyVariant[]; edges?: { node: ShopifyVariant }[] } | null;
};
export type ShopifyImage = { url: string; width?: number | null; height?: number | null; altText?: string | null };
export type ShopifyVariant = {
  id: string;
  availableForSale?: boolean | null;
  quantityAvailable?: number | null;
  selectedOptions?: { name: string; value: string }[] | null;
  price?: { amount: string; currencyCode: string } | null;
};

export type FromShopifyOptions = {
  /** The option that holds the size. Default: "Size". */
  sizeOption?: string;
  /** Build the link to a product. Default: its online store address, or /products/<handle>. */
  href?: (product: ShopifyProduct) => string;
  /** The category shown on the wall. Default: productType. */
  category?: (product: ShopifyProduct) => string;
  /**
   * The wall needs transparent side-view photographs, and where the sole meets the shelf.
   * Default: the first image, with the sole assumed at the bottom. Run your photographs through
   * scripts/photos/ and pass the real measures here.
   */
  photo?: (product: ShopifyProduct, image: ShopifyImage | undefined) => Partial<ShoePhoto>;
  /** Which tag marks a new shoe. Default: "new". */
  newTag?: string;
};

function nodes<T>(list?: { nodes?: T[]; edges?: { node: T }[] } | null): T[] {
  return list?.nodes ?? list?.edges?.map((e) => e.node) ?? [];
}

/** A plain function with no dependency and no network call: a Storefront response in, Shoe[] out. */
export function fromShopifyProducts(products: ShopifyProduct[], options: FromShopifyOptions = {}): Shoe[] {
  const sizeOption = (options.sizeOption ?? "Size").toLowerCase();
  const newTag = (options.newTag ?? "new").toLowerCase();

  return products.map((product) => {
    const image = nodes(product.images)[0];
    const given = options.photo?.(product, image) ?? {};
    const photo: ShoePhoto = {
      src: image?.url ?? "",
      width: image?.width ?? 1600,
      height: image?.height ?? 1000,
      baseline: 1,
      contact: [0.2, 0.9],
      alt: image?.altText ?? product.title,
      ...given,
    };

    const sizes: ShoeSize[] = nodes(product.variants).flatMap((variant) => {
      const option = variant.selectedOptions?.find((o) => o.name.toLowerCase() === sizeOption);
      if (!option) return [];
      const stock = variant.quantityAvailable ?? (variant.availableForSale ? 1 : 0);
      return [{ eu: option.value, stock: Math.max(0, stock), variantId: variant.id }];
    });

    const price = product.priceRange?.minVariantPrice;
    const compare = product.compareAtPriceRange?.minVariantPrice;
    const compareAmount = compare ? Number(compare.amount) : 0;
    const amount = Number(price?.amount ?? 0);

    return {
      id: product.id,
      slug: product.handle,
      href: options.href?.(product) ?? product.onlineStoreUrl ?? `/products/${product.handle}`,
      name: product.title,
      category: options.category?.(product) ?? product.productType ?? "",
      price: amount,
      compareAtPrice: compareAmount > amount ? compareAmount : undefined,
      currency: price?.currencyCode ?? "USD",
      isNew: product.tags?.some((t) => t.toLowerCase() === newTag) ?? false,
      addedAt: product.createdAt ?? undefined,
      photo,
      sizes,
      description: product.description ?? undefined,
    };
  });
}
