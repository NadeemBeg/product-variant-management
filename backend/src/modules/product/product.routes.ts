import { Router } from "express";
import { validate } from "../../middleware/validate.js";
import { requireSeller } from "../seller/auth.js";
import { buyerController, sellerController } from "./product.controller.js";
import {
  adjustStockBody,
  createProductBody,
  imageIdParam,
  imageInput,
  listQuery,
  productIdParam,
  purchaseBody,
  updateProductBody,
  updateVariantBody,
  variantIdParam,
  variantInput,
} from "./product.schema.js";

/* --------------------------- buyer (public) --------------------------- */
export const buyerRouter = Router();

buyerRouter.get("/", validate({ query: listQuery }), buyerController.list);
buyerRouter.get("/:productId", validate({ params: productIdParam }), buyerController.get);
buyerRouter.post(
  "/:productId/variants/:variantId/purchase",
  validate({ params: variantIdParam, body: purchaseBody }),
  buyerController.purchase,
);

/* --------------------------- seller (authenticated) --------------------------- */
export const sellerRouter = Router();

// Every seller route derives identity from the bearer token, never the body.
sellerRouter.use(requireSeller);

sellerRouter.get("/products", validate({ query: listQuery }), sellerController.list);
sellerRouter.post("/products", validate({ body: createProductBody }), sellerController.create);
sellerRouter.get("/products/:productId", validate({ params: productIdParam }), sellerController.get);
sellerRouter.patch(
  "/products/:productId",
  validate({ params: productIdParam, body: updateProductBody }),
  sellerController.update,
);
sellerRouter.delete("/products/:productId", validate({ params: productIdParam }), sellerController.remove);

sellerRouter.post(
  "/products/:productId/variants",
  validate({ params: productIdParam, body: variantInput }),
  sellerController.addVariant,
);
sellerRouter.patch(
  "/products/:productId/variants/:variantId",
  validate({ params: variantIdParam, body: updateVariantBody }),
  sellerController.updateVariant,
);
sellerRouter.delete(
  "/products/:productId/variants/:variantId",
  validate({ params: variantIdParam }),
  sellerController.removeVariant,
);
sellerRouter.patch(
  "/products/:productId/variants/:variantId/stock",
  validate({ params: variantIdParam, body: adjustStockBody }),
  sellerController.adjustStock,
);
sellerRouter.post(
  "/products/:productId/variants/:variantId/images",
  validate({ params: variantIdParam, body: imageInput }),
  sellerController.attachImage,
);
sellerRouter.delete(
  "/products/:productId/variants/:variantId/images/:imageId",
  validate({ params: imageIdParam }),
  sellerController.detachImage,
);
