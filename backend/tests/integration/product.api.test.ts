import { describe, expect, it } from "vitest";
import { AUTH, api, createProductAs, sampleProduct } from "../helpers/request.js";
import { useTestDb } from "../helpers/db.js";

useTestDb();

describe("seller product CRUD", () => {
  it("creates a product with variants and derives combination keys (201)", async () => {
    const res = await createProductAs(AUTH.amara);
    expect(res.status).toBe(201);
    expect(res.body.id).toBeDefined();
    expect(res.body.sellerId).toBe("seller_amara");
    expect(res.body.variants).toHaveLength(4);
    expect(res.body.priceRange).toEqual({ min: 100, max: 110 });
    // SKUs are normalised to upper-case.
    expect(res.body.variants[0].sku).toBe("RED-S");
  });

  it("rejects creation without a token (401)", async () => {
    const res = await api().post("/api/seller/products").send(sampleProduct());
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe("UNAUTHORIZED");
  });

  it("rejects an invalid body with structured details (400)", async () => {
    const res = await api()
      .post("/api/seller/products")
      .set("Authorization", AUTH.amara)
      .send({ title: "", options: [], variants: [] });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
    expect(Array.isArray(res.body.error.details)).toBe(true);
  });

  it("rejects a variant whose attributes are not valid for the options (400)", async () => {
    const res = await createProductAs(AUTH.amara, {
      variants: [{ sku: "X", attributes: { Color: "Purple", Size: "S" }, price: 10, stock: 1 }],
    });
    expect(res.status).toBe(400);
  });

  it("rejects a duplicate variant combination within a product (409)", async () => {
    const res = await createProductAs(AUTH.amara, {
      variants: [
        { sku: "A", attributes: { Color: "Red", Size: "S" }, price: 10, stock: 1 },
        { sku: "B", attributes: { Color: "Red", Size: "S" }, price: 10, stock: 1 },
      ],
    });
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe("DUPLICATE_VARIANT");
  });

  it("rejects a duplicate SKU across different products (409)", async () => {
    await createProductAs(AUTH.amara);
    const res = await createProductAs(AUTH.amara, {
      title: "Another",
      variants: [{ sku: "RED-S", attributes: { Color: "Red", Size: "S" }, price: 10, stock: 1 }],
    });
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe("DUPLICATE_SKU");
  });

  it("updates scalar fields and bumps the version", async () => {
    const created = await createProductAs(AUTH.amara);
    const res = await api()
      .patch(`/api/seller/products/${created.body.id}`)
      .set("Authorization", AUTH.amara)
      .send({ title: "Renamed", status: "draft" });
    expect(res.status).toBe(200);
    expect(res.body.title).toBe("Renamed");
    expect(res.body.status).toBe("draft");
  });

  it("deletes a product (204) and then 404s", async () => {
    const created = await createProductAs(AUTH.amara);
    const del = await api().delete(`/api/seller/products/${created.body.id}`).set("Authorization", AUTH.amara);
    expect(del.status).toBe(204);
    const get = await api().get(`/api/seller/products/${created.body.id}`).set("Authorization", AUTH.amara);
    expect(get.status).toBe(404);
  });
});

describe("authorization / ownership", () => {
  it("hides another seller's product behind a 404", async () => {
    const created = await createProductAs(AUTH.amara);
    const res = await api().get(`/api/seller/products/${created.body.id}`).set("Authorization", AUTH.rafi);
    expect(res.status).toBe(404);
  });

  it("forbids another seller from mutating a product (404)", async () => {
    const created = await createProductAs(AUTH.amara);
    const res = await api()
      .patch(`/api/seller/products/${created.body.id}`)
      .set("Authorization", AUTH.rafi)
      .send({ title: "hijack" });
    expect(res.status).toBe(404);
  });

  it("scopes the seller product list to the owner", async () => {
    await createProductAs(AUTH.amara);
    const res = await api().get("/api/seller/products").set("Authorization", AUTH.rafi);
    expect(res.status).toBe(200);
    expect(res.body.items).toHaveLength(0);
  });

  it("ignores any sellerId supplied in the body (identity comes from the token)", async () => {
    const res = await api()
      .post("/api/seller/products")
      .set("Authorization", AUTH.amara)
      .send({ ...sampleProduct(), sellerId: "seller_rafi" });
    // `.strict()` rejects unknown keys — spoofing is a validation error, not a silent accept.
    expect(res.status).toBe(400);
  });
});

describe("variant management", () => {
  it("adds, updates and removes a variant", async () => {
    const created = await createProductAs(AUTH.amara, {
      options: [{ name: "Color", values: ["Red", "Blue", "Green"] }, { name: "Size", values: ["S", "M"] }],
    });
    const id = created.body.id;

    const add = await api()
      .post(`/api/seller/products/${id}/variants`)
      .set("Authorization", AUTH.amara)
      .send({ sku: "GREEN-S", attributes: { Color: "Green", Size: "S" }, price: 120, stock: 4 });
    expect(add.status).toBe(201);
    const variant = add.body.variants.find((v: { sku: string }) => v.sku === "GREEN-S");
    expect(variant).toBeDefined();

    const upd = await api()
      .patch(`/api/seller/products/${id}/variants/${variant.id}`)
      .set("Authorization", AUTH.amara)
      .send({ price: 130, available: false });
    expect(upd.status).toBe(200);
    expect(upd.body.variants.find((v: { id: string }) => v.id === variant.id).price).toBe(130);

    const rem = await api()
      .delete(`/api/seller/products/${id}/variants/${variant.id}`)
      .set("Authorization", AUTH.amara);
    expect(rem.status).toBe(200);
    expect(rem.body.variants.find((v: { id: string }) => v.id === variant.id)).toBeUndefined();
  });

  it("attaches and detaches an image on a variant", async () => {
    const created = await createProductAs(AUTH.amara);
    const id = created.body.id;
    const variantId = created.body.variants[0].id;

    const attach = await api()
      .post(`/api/seller/products/${id}/variants/${variantId}/images`)
      .set("Authorization", AUTH.amara)
      .send({ url: "https://example.com/a.jpg", alt: "front" });
    expect(attach.status).toBe(201);
    const imageId = attach.body.variants[0].images[0].id;
    expect(imageId).toBeDefined();

    const detach = await api()
      .delete(`/api/seller/products/${id}/variants/${variantId}/images/${imageId}`)
      .set("Authorization", AUTH.amara);
    expect(detach.status).toBe(200);
    expect(detach.body.variants[0].images).toHaveLength(0);
  });
});

describe("stock adjustment", () => {
  it("sets an absolute stock value", async () => {
    const created = await createProductAs(AUTH.amara);
    const v = created.body.variants[0];
    const res = await api()
      .patch(`/api/seller/products/${created.body.id}/variants/${v.id}/stock`)
      .set("Authorization", AUTH.amara)
      .send({ set: 42 });
    expect(res.status).toBe(200);
    expect(res.body.variants.find((x: { id: string }) => x.id === v.id).stock).toBe(42);
  });

  it("applies a delta", async () => {
    const created = await createProductAs(AUTH.amara);
    const v = created.body.variants[0]; // stock 5
    const res = await api()
      .patch(`/api/seller/products/${created.body.id}/variants/${v.id}/stock`)
      .set("Authorization", AUTH.amara)
      .send({ delta: -2 });
    expect(res.body.variants.find((x: { id: string }) => x.id === v.id).stock).toBe(3);
  });

  it("refuses a delta that would drive stock negative (409)", async () => {
    const created = await createProductAs(AUTH.amara);
    const v = created.body.variants[0]; // stock 5
    const res = await api()
      .patch(`/api/seller/products/${created.body.id}/variants/${v.id}/stock`)
      .set("Authorization", AUTH.amara)
      .send({ delta: -99 });
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe("INSUFFICIENT_STOCK");
  });

  it("rejects providing both set and delta (400)", async () => {
    const created = await createProductAs(AUTH.amara);
    const v = created.body.variants[0];
    const res = await api()
      .patch(`/api/seller/products/${created.body.id}/variants/${v.id}/stock`)
      .set("Authorization", AUTH.amara)
      .send({ set: 1, delta: 1 });
    expect(res.status).toBe(400);
  });
});

describe("buyer storefront", () => {
  it("lists only published products", async () => {
    await createProductAs(AUTH.amara, { status: "published" });
    await createProductAs(AUTH.amara, {
      status: "draft",
      title: "Hidden",
      variants: [{ sku: "DRAFT-1", attributes: { Color: "Red", Size: "S" }, price: 1, stock: 1 }],
    });
    const res = await api().get("/api/products");
    expect(res.status).toBe(200);
    expect(res.body.items).toHaveLength(1);
    expect(res.body.items[0].status).toBe("published");
  });

  it("404s on a draft product detail", async () => {
    const created = await createProductAs(AUTH.amara, {
      status: "draft",
      variants: [{ sku: "DRAFT-2", attributes: { Color: "Red", Size: "S" }, price: 1, stock: 1 }],
    });
    const res = await api().get(`/api/products/${created.body.id}`);
    expect(res.status).toBe(404);
  });

  it("purchases an in-stock variant and decrements stock", async () => {
    const created = await createProductAs(AUTH.amara);
    const v = created.body.variants.find((x: { sku: string }) => x.sku === "RED-S"); // stock 5
    const res = await api().post(`/api/products/${created.body.id}/variants/${v.id}/purchase`).send({ qty: 2 });
    expect(res.status).toBe(200);
    expect(res.body.variants.find((x: { id: string }) => x.id === v.id).stock).toBe(3);
  });

  it("refuses to purchase an out-of-stock variant (409)", async () => {
    const created = await createProductAs(AUTH.amara);
    const v = created.body.variants.find((x: { sku: string }) => x.sku === "BLUE-S"); // stock 0
    const res = await api().post(`/api/products/${created.body.id}/variants/${v.id}/purchase`).send({ qty: 1 });
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe("INSUFFICIENT_STOCK");
  });

  it("404s for an unknown variant id", async () => {
    const created = await createProductAs(AUTH.amara);
    const res = await api()
      .post(`/api/products/${created.body.id}/variants/5f1d7f3b9b1e8a001c000000/purchase`)
      .send({ qty: 1 });
    expect(res.status).toBe(404);
  });
});
