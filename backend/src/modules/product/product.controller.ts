import type { Request, Response } from "express";
import { asyncHandler } from "../../utils/asyncHandler.js";
import * as service from "./product.service.js";
import { presentList, presentProduct } from "./product.presenter.js";

/** The authenticated seller, always from the server-derived identity. */
function sellerId(req: Request): string {
  // requireSeller guarantees this is populated.
  return req.seller!.id;
}

/* ----------------------------- seller ----------------------------- */

export const sellerController = {
  create: asyncHandler(async (req, res: Response) => {
    const product = await service.createProduct(sellerId(req), req.body);
    res.status(201).json(presentProduct(product));
  }),

  list: asyncHandler(async (req, res) => {
    const result = await service.listSellerProducts(sellerId(req), req.query as never);
    res.json(presentList(result));
  }),

  get: asyncHandler(async (req, res) => {
    const product = await service.getSellerProduct(sellerId(req), req.params.productId!);
    res.json(presentProduct(product));
  }),

  update: asyncHandler(async (req, res) => {
    const product = await service.updateProduct(sellerId(req), req.params.productId!, req.body);
    res.json(presentProduct(product));
  }),

  remove: asyncHandler(async (req, res) => {
    await service.deleteProduct(sellerId(req), req.params.productId!);
    res.status(204).send();
  }),

  addVariant: asyncHandler(async (req, res) => {
    const product = await service.addVariant(sellerId(req), req.params.productId!, req.body);
    res.status(201).json(presentProduct(product));
  }),

  updateVariant: asyncHandler(async (req, res) => {
    const product = await service.updateVariant(
      sellerId(req),
      req.params.productId!,
      req.params.variantId!,
      req.body,
    );
    res.json(presentProduct(product));
  }),

  removeVariant: asyncHandler(async (req, res) => {
    const product = await service.removeVariant(sellerId(req), req.params.productId!, req.params.variantId!);
    res.json(presentProduct(product));
  }),

  adjustStock: asyncHandler(async (req, res) => {
    const product = await service.adjustStock(
      sellerId(req),
      req.params.productId!,
      req.params.variantId!,
      req.body,
    );
    res.json(presentProduct(product));
  }),

  attachImage: asyncHandler(async (req, res) => {
    const product = await service.attachImage(
      sellerId(req),
      req.params.productId!,
      req.params.variantId!,
      req.body,
    );
    res.status(201).json(presentProduct(product));
  }),

  detachImage: asyncHandler(async (req, res) => {
    const product = await service.detachImage(
      sellerId(req),
      req.params.productId!,
      req.params.variantId!,
      req.params.imageId!,
    );
    res.json(presentProduct(product));
  }),
};

/* ----------------------------- buyer ----------------------------- */

export const buyerController = {
  list: asyncHandler(async (req, res) => {
    const result = await service.listPublished(req.query as never);
    res.json(presentList(result));
  }),

  get: asyncHandler(async (req, res) => {
    const product = await service.getPublished(req.params.productId!);
    res.json(presentProduct(product));
  }),

  purchase: asyncHandler(async (req, res) => {
    const product = await service.purchase(
      req.params.productId!,
      req.params.variantId!,
      req.body.qty,
    );
    res.json(presentProduct(product));
  }),
};
