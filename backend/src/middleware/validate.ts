import type { NextFunction, Request, Response } from "express";
import { ZodError, type ZodTypeAny, z } from "zod";
import { ApiError } from "../utils/ApiError.js";

interface Schemas {
  body?: ZodTypeAny;
  params?: ZodTypeAny;
  query?: ZodTypeAny;
}

function flatten(err: ZodError) {
  return err.issues.map((i) => ({ path: i.path.join("."), message: i.message }));
}

/**
 * Validation happens once, at the boundary. Each handler declares the exact
 * shape it accepts; parsed+coerced values replace the raw request fields so
 * controllers work with trusted, typed data and never re-validate.
 */
export function validate(schemas: Schemas) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    try {
      if (schemas.params) req.params = schemas.params.parse(req.params);
      if (schemas.query) Object.assign(req.query, schemas.query.parse(req.query));
      if (schemas.body) req.body = schemas.body.parse(req.body);
      next();
    } catch (err) {
      if (err instanceof ZodError) {
        next(ApiError.badRequest("Request validation failed", flatten(err)));
        return;
      }
      next(err);
    }
  };
}

export { z };
