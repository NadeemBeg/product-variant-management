import type { NextFunction, Request, RequestHandler, Response } from "express";

/**
 * Wraps an async route handler so any rejected promise is forwarded to the
 * Express error middleware instead of hanging the request. Lets controllers be
 * written as plain `async` functions with `throw` for errors.
 */
export const asyncHandler =
  (fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>): RequestHandler =>
  (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
