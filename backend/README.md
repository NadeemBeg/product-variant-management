# PVMS — Backend API

Product Variant Management System API. **Express + Mongoose + MongoDB**, TypeScript, Zod validation, Vitest + Supertest + in-memory Mongo for tests.

## Quick start

```bash
cd backend
cp .env.example .env            # defaults work for local dev
npm install

# Option A — you have a local MongoDB on :27017
npm run seed                    # loads 2 demo products
npm run dev                     # http://localhost:4000

# Option B — no local MongoDB? Point MONGO_URI at any instance, e.g. Atlas.
```

> No MongoDB handy? The **test suite needs none** — it boots an ephemeral in-memory
> MongoDB automatically. Just run `npm test`.

### Scripts

| Script | Does |
|---|---|
| `npm run dev` | Start API with watch-reload (`tsx`) |
| `npm start` | Start API once |
| `npm run seed` | Wipe + load demo products |
| `npm test` | Run unit + integration tests (self-contained Mongo) |
| `npm run test:cov` | Tests with coverage report |
| `npm run typecheck` | `tsc --noEmit` |

### Demo auth tokens

Auth is **stubbed** (see [NOTES](../NOTES.md)). Send one of these as a bearer token on seller routes:

- `tok_seller_amara` → *Amara Handlooms*
- `tok_seller_rafi` → *Rafi Woodcraft*

```
Authorization: Bearer tok_seller_amara
```

## Architecture

```
src/
  app.ts                 Express app factory (used by server + tests)
  server.ts              Boot: connect DB, listen, graceful shutdown
  config/env.ts          Zod-validated, typed configuration
  db/connect.ts          Mongoose connect + index sync
  middleware/            validate (Zod), error handler, 404
  utils/                 ApiError, asyncHandler
  modules/
    product/
      product.model.ts       Mongoose schema (variants embedded)
      product.domain.ts      PURE logic (resolution, combination keys) — heavily unit-tested
      product.schema.ts      Zod request schemas
      product.service.ts     Business logic + data access (incl. atomic stock paths)
      product.presenter.ts   DTO shaping
      product.controller.ts  Thin HTTP layer
      product.routes.ts      Buyer (public) + seller (authenticated) routers
    seller/auth.ts        Stubbed bearer-token auth + requireSeller middleware
    upload/upload.routes.ts  Multipart image upload (swap for object storage)
```

**Layering:** transport (controller/routes) → business logic (service) → data (model). Pure
rules live in `product.domain.ts` with no framework imports. The controller never reads the
seller from the body — only from `req.seller`, set by `requireSeller`.

## Data model

A **product embeds its variants**. The product declares `options` (e.g. `Color: [Red, Blue]`,
`Size: [S, M]`); each variant pins one value per option in `attributes` and carries its own
`sku`, `price`, `stock`, `available`, and `images`. A derived `combinationKey` makes duplicate
detection an O(1) string check and lets the model extend to an Nth option with no schema change.
Rationale and the "when to split into a referenced collection" tipping point are in
[NOTES](../NOTES.md).

- **Global SKU uniqueness** is enforced by a partial unique index on `variants.sku`.
- **Within-product** duplicate combinations/SKUs are enforced in the service (a multikey unique
  index can't catch duplicates inside one document's array).
- **Edit races** use Mongoose optimistic concurrency (`__v`) → `409 VERSION_CONFLICT`.
- **Stock** uses conditional atomic updates (`$inc` with a `$gte` guard) — never read-modify-write.

## Error shape

Every error is returned as:

```json
{ "error": { "code": "VALIDATION_ERROR", "message": "…", "details": [ … ] } }
```

| Status | Codes |
|---|---|
| 400 | `VALIDATION_ERROR` |
| 401 | `UNAUTHORIZED` |
| 403 | `FORBIDDEN` |
| 404 | `NOT_FOUND` |
| 409 | `DUPLICATE_SKU`, `DUPLICATE_VARIANT`, `INSUFFICIENT_STOCK`, `VERSION_CONFLICT`, `CONFLICT` |
| 500 | `INTERNAL` |

## API

Base URL: `http://localhost:4000`. Full machine-readable spec: [`docs/openapi.yaml`](./docs/openapi.yaml).

### Buyer (public)

| Method | Path | Notes |
|---|---|---|
| `GET` | `/api/products` | List **published** products. Query: `q`, `category`, `page`, `limit` |
| `GET` | `/api/products/:productId` | Published product detail |
| `POST` | `/api/products/:productId/variants/:variantId/purchase` | Body `{ qty }`. Atomic stock decrement |

### Seller (bearer token required)

| Method | Path |
|---|---|
| `GET` | `/api/seller/products` |
| `POST` | `/api/seller/products` |
| `GET` | `/api/seller/products/:productId` |
| `PATCH` | `/api/seller/products/:productId` |
| `DELETE` | `/api/seller/products/:productId` |
| `POST` | `/api/seller/products/:productId/variants` |
| `PATCH` | `/api/seller/products/:productId/variants/:variantId` |
| `DELETE` | `/api/seller/products/:productId/variants/:variantId` |
| `PATCH` | `/api/seller/products/:productId/variants/:variantId/stock` — body `{ set }` **or** `{ delta }` |
| `POST` | `/api/seller/products/:productId/variants/:variantId/images` — body `{ url, alt? }` |
| `DELETE` | `/api/seller/products/:productId/variants/:variantId/images/:imageId` |
| `POST` | `/api/uploads` — `multipart/form-data` field `file` → `{ url }` |

### Example: create a product

```bash
curl -X POST localhost:4000/api/seller/products \
  -H "Authorization: Bearer tok_seller_amara" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Hand-block Scarf",
    "category": "Scarves",
    "status": "published",
    "options": [
      { "name": "Color", "values": ["Indigo", "Red"] },
      { "name": "Size",  "values": ["Regular", "Large"] }
    ],
    "variants": [
      { "sku": "SCF-IND-R", "attributes": { "Color": "Indigo", "Size": "Regular" }, "price": 1299, "stock": 10 },
      { "sku": "SCF-IND-L", "attributes": { "Color": "Indigo", "Size": "Large" },  "price": 1599, "stock": 4  }
    ]
  }'
```

### Example: buy (atomic)

```bash
curl -X POST localhost:4000/api/products/<id>/variants/<vid>/purchase \
  -H "Content-Type: application/json" -d '{ "qty": 1 }'
# 200 → updated product; 409 INSUFFICIENT_STOCK if it just sold out.
```

## Tests

```bash
npm test
```

- `tests/unit/` — pure domain logic (`combinationKey`, `resolveVariant`, `validateVariantAttributes`,
  price range) and the auth middleware.
- `tests/integration/` — the API over the real middleware stack via Supertest, including validation,
  duplicate detection, cross-seller 404s, stock adjustment, images, buyer flows, and a
  **concurrency suite** that fires many racing purchases and asserts no oversell / no lost update.
