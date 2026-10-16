import type { ProductDoc, VariantDoc } from "./product.model.js";
import { type Attributes, isPurchasable, priceRange } from "./product.domain.js";

function attrs(a: unknown): Attributes {
  if (a instanceof Map) return Object.fromEntries(a) as Attributes;
  return { ...(a as Attributes) };
}

export function presentVariant(v: VariantDoc) {
  return {
    id: String(v._id),
    sku: v.sku,
    attributes: attrs(v.attributes),
    price: v.price,
    currency: v.currency,
    stock: v.stock,
    available: v.available,
    purchasable: isPurchasable({ available: v.available, stock: v.stock, attributes: {} }),
    images: (v.images ?? []).map((img) => ({ id: String(img._id), url: img.url, alt: img.alt })),
  };
}

export function presentProduct(doc: ProductDoc) {
  const variants = (doc.variants ?? []).map(presentVariant);
  return {
    id: String(doc._id),
    sellerId: doc.sellerId,
    title: doc.title,
    description: doc.description,
    category: doc.category,
    status: doc.status,
    options: (doc.options ?? []).map((o) => ({ name: o.name, values: [...o.values] })),
    variants,
    priceRange: priceRange(
      (doc.variants ?? []).map((v) => ({ price: v.price, available: v.available, stock: v.stock, attributes: {} })),
    ),
    inStock: variants.some((v) => v.purchasable),
    // Exposes the optimistic-concurrency version so clients can detect edit races.
    version: (doc as unknown as { __v: number }).__v,
    createdAt: (doc as unknown as { createdAt: Date }).createdAt,
    updatedAt: (doc as unknown as { updatedAt: Date }).updatedAt,
  };
}

export function presentList(result: {
  items: ProductDoc[];
  total: number;
  page: number;
  limit: number;
  pages: number;
}) {
  return {
    items: result.items.map(presentProduct),
    pagination: { total: result.total, page: result.page, limit: result.limit, pages: result.pages },
  };
}
