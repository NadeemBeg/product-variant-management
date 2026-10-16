import request from "supertest";
import { createApp } from "../../src/app.js";
import type { CreateProductBody } from "../../src/modules/product/product.schema.js";

export const app = createApp();
export const api = () => request(app);

export const AUTH = {
  amara: "Bearer tok_seller_amara",
  rafi: "Bearer tok_seller_rafi",
};

/** A valid 2-axis product body (Color × Size) for reuse across tests. */
export function sampleProduct(overrides: Partial<CreateProductBody> = {}): CreateProductBody {
  return {
    title: "Test Scarf",
    description: "A test product",
    category: "Scarves",
    status: "published",
    options: [
      { name: "Color", values: ["Red", "Blue"] },
      { name: "Size", values: ["S", "M"] },
    ],
    variants: [
      { sku: "RED-S", attributes: { Color: "Red", Size: "S" }, price: 100, stock: 5 },
      { sku: "RED-M", attributes: { Color: "Red", Size: "M" }, price: 110, stock: 3 },
      { sku: "BLUE-S", attributes: { Color: "Blue", Size: "S" }, price: 100, stock: 0 },
      { sku: "BLUE-M", attributes: { Color: "Blue", Size: "M" }, price: 110, stock: 2 },
    ],
    ...overrides,
  };
}

/** Create a product as a seller and return the parsed body. */
export async function createProductAs(token: string, body?: Partial<CreateProductBody>) {
  const res = await api()
    .post("/api/seller/products")
    .set("Authorization", token)
    .send(sampleProduct(body));
  return res;
}
