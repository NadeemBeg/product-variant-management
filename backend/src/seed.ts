import { env } from "./config/env.js";
import { connectDb, disconnectDb } from "./db/connect.js";
import { Product } from "./modules/product/product.model.js";
import { createProduct } from "./modules/product/product.service.js";

/**
 * Seeds a couple of demo products so the storefront has something to render.
 * Run with `npm run seed`. Idempotent: it wipes the products collection first.
 */
async function seed() {
  await connectDb(env.MONGO_URI);
  await Product.deleteMany({});

  await createProduct("seller_amara", {
    title: "Hand-block Printed Cotton Scarf",
    description: "Naturally dyed, hand-block printed in Bagru. Soft mul cotton.",
    category: "Scarves",
    status: "published",
    options: [
      { name: "Color", values: ["Indigo", "Madder Red", "Marigold"] },
      { name: "Size", values: ["Regular", "Large"] },
    ],
    variants: [
      { sku: "SCF-IND-R", attributes: { Color: "Indigo", Size: "Regular" }, price: 1299, stock: 12, images: [{ url: "https://picsum.photos/seed/indigo-r/800", alt: "Indigo regular" }] },
      { sku: "SCF-IND-L", attributes: { Color: "Indigo", Size: "Large" }, price: 1599, stock: 5, images: [{ url: "https://picsum.photos/seed/indigo-l/800", alt: "Indigo large" }] },
      { sku: "SCF-RED-R", attributes: { Color: "Madder Red", Size: "Regular" }, price: 1299, stock: 0, images: [{ url: "https://picsum.photos/seed/red-r/800", alt: "Red regular" }] },
      { sku: "SCF-RED-L", attributes: { Color: "Madder Red", Size: "Large" }, price: 1599, stock: 3, images: [{ url: "https://picsum.photos/seed/red-l/800", alt: "Red large" }] },
      { sku: "SCF-MAR-R", attributes: { Color: "Marigold", Size: "Regular" }, price: 1299, stock: 8, available: false, images: [{ url: "https://picsum.photos/seed/mar-r/800", alt: "Marigold regular" }] },
      { sku: "SCF-MAR-L", attributes: { Color: "Marigold", Size: "Large" }, price: 1599, stock: 6, images: [{ url: "https://picsum.photos/seed/mar-l/800", alt: "Marigold large" }] },
    ],
  });

  await createProduct("seller_rafi", {
    title: "Sheesham Wood Serving Bowl",
    description: "Hand-turned sheesham (Indian rosewood) bowl, food-safe finish.",
    category: "Kitchen",
    status: "published",
    options: [{ name: "Size", values: ["Small", "Medium", "Large"] }],
    variants: [
      { sku: "BWL-S", attributes: { Size: "Small" }, price: 799, stock: 20, images: [{ url: "https://picsum.photos/seed/bowl-s/800", alt: "Small bowl" }] },
      { sku: "BWL-M", attributes: { Size: "Medium" }, price: 1099, stock: 10, images: [{ url: "https://picsum.photos/seed/bowl-m/800", alt: "Medium bowl" }] },
      { sku: "BWL-L", attributes: { Size: "Large" }, price: 1499, stock: 2, images: [{ url: "https://picsum.photos/seed/bowl-l/800", alt: "Large bowl" }] },
    ],
  });

  const count = await Product.countDocuments();
  // eslint-disable-next-line no-console
  console.log(`Seeded ${count} products. Demo seller tokens: tok_seller_amara, tok_seller_rafi`);
  await disconnectDb();
}

seed().catch((err) => {
  console.error("Seed failed", err);
  process.exit(1);
});
