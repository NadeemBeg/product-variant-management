import type { NextFunction, Request, Response } from "express";
import mongoose from "mongoose";
import { ApiError, type ErrorCode } from "../utils/ApiError.js";

/** 404 for any unmatched route. */
export function notFound(_req: Request, _res: Response, next: NextFunction): void {
  next(ApiError.notFound("Route not found"));
}

interface WireError {
  error: { code: ErrorCode; message: string; details?: unknown };
}

/**
 * The single place that turns a thrown error into an HTTP response, so every
 * error on the wire has the same shape:
 *   { "error": { "code", "message", "details"? } }
 */
export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- 4-arg signature marks this as Express error middleware
  _next: NextFunction,
): void {
  let status = 500;
  let code: ErrorCode = "INTERNAL";
  let message = "Internal server error";
  let details: unknown;

  if (err instanceof ApiError) {
    status = err.status;
    code = err.code;
    message = err.message;
    details = err.details;
  } else if (err instanceof mongoose.Error.ValidationError) {
    status = 400;
    code = "VALIDATION_ERROR";
    message = "Document validation failed";
    details = Object.values(err.errors).map((e) => ({ path: e.path, message: e.message }));
  } else if (err instanceof mongoose.Error.VersionError) {
    status = 409;
    code = "VERSION_CONFLICT";
    message = "The resource was modified concurrently; reload and retry";
  } else if (isDuplicateKey(err)) {
    status = 409;
    code = "DUPLICATE_SKU";
    message = "A variant with this SKU already exists";
    details = (err as { keyValue?: unknown }).keyValue;
  } else if (err instanceof Error) {
    message = err.message;
  }

  if (status >= 500) {
    // Real logging would go to a transport here; keep stderr for the reference app.
    console.error("[error]", err);
  }

  const body: WireError = { error: { code, message, ...(details ? { details } : {}) } };
  res.status(status).json(body);
}

function isDuplicateKey(err: unknown): boolean {
  return typeof err === "object" && err !== null && (err as { code?: number }).code === 11000;
}
