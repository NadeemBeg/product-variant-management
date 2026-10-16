import express, { type Express } from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import path from "node:path";
import { env, isTest } from "./config/env.js";
import { buyerRouter, sellerRouter } from "./modules/product/product.routes.js";
import { uploadRouter } from "./modules/upload/upload.routes.js";
import { errorHandler, notFound } from "./middleware/error.js";

/**
 * App factory. Returns a fully-wired Express app without binding a port, so the
 * same instance is used by `server.ts` and by Supertest in the integration
 * suite — the tests exercise the real middleware stack, not a mock.
 */
export function createApp(): Express {
  const app = express();

  app.use(helmet());
  app.use(cors({ origin: env.CORS_ORIGIN === "*" ? true : env.CORS_ORIGIN.split(",") }));
  app.use(express.json({ limit: "1mb" }));
  if (!isTest) app.use(morgan("dev"));

  // Serve uploaded images (swap for object-storage URLs in production).
  app.use(`/${env.UPLOAD_DIR}`, express.static(path.resolve(env.UPLOAD_DIR)));

  app.get("/health", (_req, res) => res.json({ status: "ok", uptime: process.uptime() }));

  app.use("/api/products", buyerRouter);
  app.use("/api/seller", sellerRouter);
  app.use("/api/uploads", uploadRouter);

  app.use(notFound);
  app.use(errorHandler);

  return app;
}
