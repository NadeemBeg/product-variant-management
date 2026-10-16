import { Product, type ProductDoc } from "./product.model.js";
import {
  type Attributes,
  type OptionDef,
  combinationKey,
  validateVariantAttributes,
} from "./product.domain.js";
import type { CreateProductBody, ListQuery, UpdateVariantBody, VariantInput } from "./product.schema.js";
import { ApiError } from "../../utils/ApiError.js";

/* ----------------------------- helpers ----------------------------- */

function optionsOf(doc: ProductDoc): OptionDef[] {
  return (doc.options ?? []).map((o) => ({ name: o.name, values: [...o.values] }));
}

function attrsToObject(attrs: unknown): Attributes {
  if (attrs instanceof Map) return Object.fromEntries(attrs) as Attributes;
  return { ...(attrs as Attributes) };
}

/** Load a product that the given seller owns, or fail with 404 (never leak
 *  existence of another seller's product). Ownership is checked in the query. */
async function loadOwned(sellerId: string, productId: string): Promise<ProductDoc> {
  const doc = await Product.findOne({ _id: productId, sellerId });
  if (!doc) throw ApiError.notFound("Product not found");
  return doc;
}

/** Enforce, within a single product, that no two variants share a combination
 *  or a SKU. (The DB unique index only covers cross-document SKU collisions.) */
function assertNoLocalDuplicates(
  options: OptionDef[],
  variants: Array<{ sku: string; attributes: Attributes }>,
) {
  const seenCombo = new Set<string>();
  const seenSku = new Set<string>();
  variants.forEach((v, i) => {
    const attrErrors = validateVariantAttributes(options, v.attributes);
    if (attrErrors.length) {
      throw ApiError.badRequest(`variant[${i}] has invalid attributes`, attrErrors);
    }
    const key = combinationKey(v.attributes);
    if (seenCombo.has(key)) {
      throw ApiError.conflict("DUPLICATE_VARIANT", `duplicate variant combination: ${key}`);
    }
    const sku = v.sku.toUpperCase();
    if (seenSku.has(sku)) {
      throw ApiError.conflict("DUPLICATE_SKU", `duplicate SKU within product: ${sku}`);
    }
    seenCombo.add(key);
    seenSku.add(sku);
  });
}

function buildVariant(input: VariantInput) {
  return {
    sku: input.sku.toUpperCase(),
    attributes: input.attributes,
    combinationKey: combinationKey(input.attributes),
    price: input.price,
    currency: input.currency ?? "INR",
    stock: input.stock,
    available: input.available ?? true,
    images: input.images ?? [],
  };
}

/** Normalise Mongo's E11000 into our DUPLICATE_SKU error. */
function rethrowDuplicate(err: unknown): never {
  if (typeof err === "object" && err !== null && (err as { code?: number }).code === 11000) {
    throw ApiError.conflict("DUPLICATE_SKU", "A variant with this SKU already exists in the catalogue");
  }
  throw err;
}

/* ----------------------------- seller: products ----------------------------- */

export async function createProduct(sellerId: string, body: CreateProductBody): Promise<ProductDoc> {
  const options: OptionDef[] = body.options.map((o) => ({ name: o.name, values: [...o.values] }));
  assertNoLocalDuplicates(options, body.variants);

  try {
    return await Product.create({
      sellerId,
      title: body.title,
      description: body.description ?? "",
      category: body.category,
      status: body.status ?? "draft",
      options,
      variants: body.variants.map(buildVariant),
    });
  } catch (err) {
    rethrowDuplicate(err);
  }
}

export async function listSellerProducts(sellerId: string, query: ListQuery) {
  const filter: Record<string, unknown> = { sellerId };
  if (query.category) filter.category = query.category;
  if (query.q) filter.title = { $regex: query.q, $options: "i" };
  return paginate(filter, query);
}

export function getSellerProduct(sellerId: string, productId: string) {
  return loadOwned(sellerId, productId);
}

export async function updateProduct(
  sellerId: string,
  productId: string,
  patch: Partial<Pick<CreateProductBody, "title" | "description" | "category" | "status">>,
): Promise<ProductDoc> {
  const doc = await loadOwned(sellerId, productId);
  Object.assign(doc, patch);
  return doc.save(); // optimistic concurrency guards against a racing edit
}

export async function deleteProduct(sellerId: string, productId: string): Promise<void> {
  const res = await Product.deleteOne({ _id: productId, sellerId });
  if (res.deletedCount === 0) throw ApiError.notFound("Product not found");
}

/* ----------------------------- seller: variants ----------------------------- */

export async function addVariant(
  sellerId: string,
  productId: string,
  input: VariantInput,
): Promise<ProductDoc> {
  const doc = await loadOwned(sellerId, productId);
  const existing = (doc.variants ?? []).map((v) => ({
    sku: v.sku,
    attributes: attrsToObject(v.attributes),
  }));
  assertNoLocalDuplicates(optionsOf(doc), [...existing, { sku: input.sku, attributes: input.attributes }]);
  doc.variants.push(buildVariant(input));
  try {
    return await doc.save();
  } catch (err) {
    rethrowDuplicate(err);
  }
}

export async function updateVariant(
  sellerId: string,
  productId: string,
  variantId: string,
  patch: UpdateVariantBody,
): Promise<ProductDoc> {
  const doc = await loadOwned(sellerId, productId);
  const variant = doc.variants.id(variantId);
  if (!variant) throw ApiError.notFound("Variant not found");

  const nextSku = (patch.sku ?? variant.sku).toUpperCase();
  const nextAttributes = patch.attributes ?? attrsToObject(variant.attributes);

  // Re-check duplicates against the *other* variants only.
  const others = (doc.variants ?? [])
    .filter((v) => String(v._id) !== variantId)
    .map((v) => ({ sku: v.sku, attributes: attrsToObject(v.attributes) }));
  assertNoLocalDuplicates(optionsOf(doc), [...others, { sku: nextSku, attributes: nextAttributes }]);

  if (patch.sku !== undefined) variant.sku = nextSku;
  if (patch.attributes !== undefined) {
    variant.attributes = nextAttributes as never;
    variant.combinationKey = combinationKey(nextAttributes);
  }
  if (patch.price !== undefined) variant.price = patch.price;
  if (patch.currency !== undefined) variant.currency = patch.currency.toUpperCase();
  if (patch.available !== undefined) variant.available = patch.available;

  try {
    return await doc.save();
  } catch (err) {
    rethrowDuplicate(err);
  }
}

export async function removeVariant(
  sellerId: string,
  productId: string,
  variantId: string,
): Promise<ProductDoc> {
  const doc = await loadOwned(sellerId, productId);
  const variant = doc.variants.id(variantId);
  if (!variant) throw ApiError.notFound("Variant not found");
  variant.deleteOne();
  return doc.save();
}

/* ----------------------------- stock (atomic) ----------------------------- */

/**
 * Seller stock adjustment. Uses a single conditional atomic update so two
 * concurrent adjustments can never lose an update or drive stock negative.
 * `set` writes an absolute value; `delta` applies a guarded increment/decrement.
 */
export async function adjustStock(
  sellerId: string,
  productId: string,
  variantId: string,
  change: { set?: number; delta?: number },
): Promise<ProductDoc> {
  if (change.set !== undefined) {
    const res = await Product.updateOne(
      { _id: productId, sellerId, "variants._id": variantId },
      { $set: { "variants.$.stock": change.set } },
    );
    if (res.matchedCount === 0) await failStockLookup(sellerId, productId, variantId);
  } else {
    const delta = change.delta!;
    const guard = delta < 0 ? { $gte: -delta } : { $gte: 0 };
    const res = await Product.updateOne(
      { _id: productId, sellerId, variants: { $elemMatch: { _id: variantId, stock: guard } } },
      { $inc: { "variants.$.stock": delta } },
    );
    if (res.matchedCount === 0) {
      await failStockLookup(sellerId, productId, variantId, delta);
    }
  }
  return loadOwned(sellerId, productId);
}

/** Produce the precise error when a conditional stock update matched nothing. */
async function failStockLookup(
  sellerId: string,
  productId: string,
  variantId: string,
  delta?: number,
): Promise<never> {
  const doc = await Product.findOne({ _id: productId, sellerId });
  if (!doc) throw ApiError.notFound("Product not found");
  const variant = doc.variants.id(variantId);
  if (!variant) throw ApiError.notFound("Variant not found");
  if (delta !== undefined && delta < 0 && variant.stock < -delta) {
    throw ApiError.conflict("INSUFFICIENT_STOCK", "Not enough stock to apply this decrement", {
      available: variant.stock,
      requested: -delta,
    });
  }
  throw ApiError.conflict("CONFLICT", "Stock update could not be applied");
}

/* ----------------------------- images ----------------------------- */

export async function attachImage(
  sellerId: string,
  productId: string,
  variantId: string,
  image: { url: string; alt?: string },
): Promise<ProductDoc> {
  const doc = await loadOwned(sellerId, productId);
  const variant = doc.variants.id(variantId);
  if (!variant) throw ApiError.notFound("Variant not found");
  variant.images.push({ url: image.url, alt: image.alt ?? "" });
  return doc.save();
}

export async function detachImage(
  sellerId: string,
  productId: string,
  variantId: string,
  imageId: string,
): Promise<ProductDoc> {
  const doc = await loadOwned(sellerId, productId);
  const variant = doc.variants.id(variantId);
  if (!variant) throw ApiError.notFound("Variant not found");
  const image = variant.images.id(imageId);
  if (!image) throw ApiError.notFound("Image not found");
  image.deleteOne();
  return doc.save();
}

/* ----------------------------- buyer ----------------------------- */

export async function listPublished(query: ListQuery) {
  const filter: Record<string, unknown> = { status: "published" };
  if (query.category) filter.category = query.category;
  if (query.q) filter.title = { $regex: query.q, $options: "i" };
  return paginate(filter, query);
}

export async function getPublished(productId: string): Promise<ProductDoc> {
  const doc = await Product.findOne({ _id: productId, status: "published" });
  if (!doc) throw ApiError.notFound("Product not found");
  return doc;
}

/**
 * Buyer purchase — THE concurrency hot path. A single conditional atomic update
 * decrements stock only if the variant is available and currently holds enough.
 * Under N racing purchases of the last unit, at most the available quantity ever
 * succeeds; the rest match nothing and are reported as out of stock. Stock can
 * never go negative and no update is lost (no read-modify-write window).
 */
export async function purchase(
  productId: string,
  variantId: string,
  qty: number,
): Promise<ProductDoc> {
  const res = await Product.updateOne(
    {
      _id: productId,
      status: "published",
      variants: { $elemMatch: { _id: variantId, available: true, stock: { $gte: qty } } },
    },
    { $inc: { "variants.$.stock": -qty } },
  );

  if (res.modifiedCount === 1) return getPublished(productId);

  // Diagnose why nothing was decremented.
  const doc = await Product.findOne({ _id: productId, status: "published" });
  if (!doc) throw ApiError.notFound("Product not found");
  const variant = doc.variants.id(variantId);
  if (!variant || !variant.available) throw ApiError.notFound("Variant not available");
  throw ApiError.conflict("INSUFFICIENT_STOCK", "This variant is out of stock", {
    available: variant.stock,
    requested: qty,
  });
}

/* ----------------------------- pagination ----------------------------- */

async function paginate(filter: Record<string, unknown>, query: ListQuery) {
  const { page, limit } = query;
  const [items, total] = await Promise.all([
    Product.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit),
    Product.countDocuments(filter),
  ]);
  return { items, total, page, limit, pages: Math.max(1, Math.ceil(total / limit)) };
}
