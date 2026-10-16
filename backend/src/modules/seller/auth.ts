import type { NextFunction, Request, Response } from "express";
import { ApiError } from "../../utils/ApiError.js";

/**
 * STUBBED authentication.
 *
 * The brief explicitly allows auth to be stubbed — the feature under evaluation
 * is variant management, not a login system. What matters, and what this models
 * faithfully, is the *shape* of real auth:
 *
 *   1. the seller identity is derived on the server from an opaque bearer token,
 *   2. it is NEVER read from the request body/params/query, and
 *   3. every write path enforces ownership against this server-derived identity.
 *
 * To plug in real auth, replace `resolveSeller` with a JWT verify (or a session
 * lookup) that returns the same `{ id, name }` shape. Nothing else changes.
 */
const TOKENS: Record<string, { id: string; name: string }> = {
  "tok_seller_amara": { id: "seller_amara", name: "Amara Handlooms" },
  "tok_seller_rafi": { id: "seller_rafi", name: "Rafi Woodcraft" },
};

export function resolveSeller(token: string | undefined): { id: string; name: string } | null {
  if (!token) return null;
  return TOKENS[token] ?? null;
}

function extractBearer(req: Request): string | undefined {
  const header = req.header("authorization");
  if (header?.toLowerCase().startsWith("bearer ")) return header.slice(7).trim();
  return undefined;
}

/** Hard gate: 401 if no/invalid token. Populates `req.seller`. */
export function requireSeller(req: Request, _res: Response, next: NextFunction): void {
  const seller = resolveSeller(extractBearer(req));
  if (!seller) {
    next(ApiError.unauthorized("Provide a valid seller bearer token"));
    return;
  }
  req.seller = seller;
  next();
}

/** For tests/seeds: the valid demo tokens. */
export const DEMO_TOKENS = Object.keys(TOKENS);
