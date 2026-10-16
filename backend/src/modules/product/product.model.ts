import mongoose, { type HydratedDocument, type InferSchemaType, type Model, Schema } from "mongoose";

/**
 * SCHEMA DESIGN — why variants are EMBEDDED in the product document.
 *
 * In a marketplace like this a product has a *bounded, small* number of variants
 * (colour × size × material rarely exceeds a few dozen), they are almost always
 * read together with the product, and they are never queried independently of
 * their parent. Embedding therefore gives us:
 *   - a single read to render a product page (no joins / N+1),
 *   - atomic, single-document updates for stock (the hot path), and
 *   - a natural ownership boundary (one `sellerId` guards the whole aggregate).
 *
 * The tipping point: if variants became unbounded (thousands per product) or
 * needed to be queried/sorted on their own at scale, we would split them into a
 * referenced `variants` collection keyed by `productId`. That trade-off is
 * documented in NOTES.md. For this domain, embedding is the correct default.
 *
 * Attribute combinations are modelled Shopify-style: the product declares its
 * `options` (e.g. Color: [Red, Blue], Size: [S, M]); each variant pins one value
 * per option in `attributes`. A derived, order-independent `combinationKey`
 * makes duplicate-combination detection a cheap string comparison and lets the
 * design extend to an Nth axis with no schema change.
 */

const imageSchema = new Schema(
  {
    url: { type: String, required: true, trim: true },
    alt: { type: String, trim: true, default: "" },
  },
  { _id: true },
);

const variantSchema = new Schema(
  {
    sku: { type: String, required: true, trim: true, uppercase: true },
    // option name -> chosen value, e.g. { Color: "Red", Size: "M" }
    attributes: { type: Map, of: String, required: true },
    // order-independent signature of `attributes`, e.g. "color=red|size=m"
    combinationKey: { type: String, required: true },
    price: { type: Number, required: true, min: 0 },
    currency: { type: String, default: "INR", uppercase: true, trim: true },
    stock: { type: Number, required: true, min: 0, default: 0 },
    available: { type: Boolean, required: true, default: true },
    images: { type: [imageSchema], default: [] },
  },
  { _id: true, timestamps: true },
);

const optionSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    values: {
      type: [String],
      required: true,
      validate: [(v: string[]) => v.length > 0, "an option must have at least one value"],
    },
  },
  { _id: false },
);

const productSchema = new Schema(
  {
    // Ownership. Always set from the authenticated seller, never from input.
    sellerId: { type: String, required: true, index: true },
    title: { type: String, required: true, trim: true },
    description: { type: String, default: "", trim: true },
    category: { type: String, required: true, trim: true, index: true },
    status: { type: String, enum: ["draft", "published"], default: "draft", index: true },
    options: { type: [optionSchema], default: [] },
    variants: { type: [variantSchema], default: [] },
  },
  {
    timestamps: true,
    // Guards read-modify-write edits (doc.save) against concurrent modification.
    // The stock hot path uses conditional atomic updates instead (see service).
    optimisticConcurrency: true,
  },
);

// Global SKU uniqueness across the whole catalogue (cross-document). NOTE: a
// multikey unique index does NOT prevent duplicates *within one document's*
// array, so same-product duplicate SKUs/combinations are enforced in the service.
productSchema.index(
  { "variants.sku": 1 },
  { unique: true, partialFilterExpression: { "variants.sku": { $exists: true } } },
);

type ProductSchemaType = InferSchemaType<typeof productSchema>;
type ProductModel = Model<ProductSchemaType>;

export type ProductDoc = HydratedDocument<ProductSchemaType>;
export type VariantDoc = NonNullable<ProductDoc["variants"]>[number];

// Cast the hot-reload cache lookup to the same Model type as the fresh model so
// the two branches don't form an un-callable union.
export const Product: ProductModel =
  (mongoose.models.Product as ProductModel | undefined) ??
  mongoose.model<ProductSchemaType>("Product", productSchema);
