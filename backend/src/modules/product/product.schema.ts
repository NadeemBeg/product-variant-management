import { z } from "zod";

const objectId = z.string().regex(/^[a-f\d]{24}$/i, "must be a 24-character hex id");

export const imageInput = z.object({
  url: z.string().url("image url must be a valid URL"),
  alt: z.string().max(200).optional(),
});

export const variantInput = z.object({
  sku: z.string().min(1).max(64),
  attributes: z.record(z.string().min(1), z.string().min(1)),
  price: z.number().nonnegative(),
  currency: z.string().length(3).optional(),
  stock: z.number().int().nonnegative(),
  available: z.boolean().optional(),
  images: z.array(imageInput).max(20).optional(),
});

export const optionInput = z.object({
  name: z.string().min(1).max(40),
  values: z.array(z.string().min(1).max(60)).nonempty("an option needs at least one value"),
});

export const createProductBody = z
  .object({
    title: z.string().min(1).max(160),
    description: z.string().max(5000).optional(),
    category: z.string().min(1).max(80),
    status: z.enum(["draft", "published"]).optional(),
    options: z.array(optionInput).min(1, "declare at least one option").max(5),
    variants: z.array(variantInput).min(1, "a product needs at least one variant").max(200),
  })
  .strict();

export const updateProductBody = z
  .object({
    title: z.string().min(1).max(160).optional(),
    description: z.string().max(5000).optional(),
    category: z.string().min(1).max(80).optional(),
    status: z.enum(["draft", "published"]).optional(),
  })
  .strict()
  .refine((b) => Object.keys(b).length > 0, "provide at least one field to update");

export const updateVariantBody = z
  .object({
    sku: z.string().min(1).max(64).optional(),
    attributes: z.record(z.string().min(1), z.string().min(1)).optional(),
    price: z.number().nonnegative().optional(),
    currency: z.string().length(3).optional(),
    available: z.boolean().optional(),
  })
  .strict()
  .refine((b) => Object.keys(b).length > 0, "provide at least one field to update");

export const adjustStockBody = z
  .object({
    set: z.number().int().nonnegative().optional(),
    delta: z.number().int().optional(),
  })
  .strict()
  .refine(
    (b) => (b.set === undefined) !== (b.delta === undefined),
    "provide exactly one of `set` or `delta`",
  );

export const purchaseBody = z
  .object({ qty: z.number().int().positive().max(10_000).default(1) })
  .strict();

export const productIdParam = z.object({ productId: objectId });
export const variantIdParam = z.object({ productId: objectId, variantId: objectId });
export const imageIdParam = z.object({ productId: objectId, variantId: objectId, imageId: objectId });

export const listQuery = z.object({
  category: z.string().max(80).optional(),
  q: z.string().max(120).optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

export type CreateProductBody = z.infer<typeof createProductBody>;
export type VariantInput = z.infer<typeof variantInput>;
export type UpdateVariantBody = z.infer<typeof updateVariantBody>;
export type AdjustStockBody = z.infer<typeof adjustStockBody>;
export type ListQuery = z.infer<typeof listQuery>;
