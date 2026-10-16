import { describe, expect, it, vi } from "vitest";
import type { NextFunction, Request, Response } from "express";
import { requireSeller, resolveSeller } from "../../src/modules/seller/auth.js";
import { ApiError } from "../../src/utils/ApiError.js";

describe("resolveSeller", () => {
  it("maps a known token to a seller", () => {
    expect(resolveSeller("tok_seller_amara")).toEqual({ id: "seller_amara", name: "Amara Handlooms" });
  });
  it("returns null for an unknown token", () => {
    expect(resolveSeller("nope")).toBeNull();
  });
  it("returns null for an absent token", () => {
    expect(resolveSeller(undefined)).toBeNull();
  });
});

function mockReq(headers: Record<string, string>): Request {
  return { header: (h: string) => headers[h.toLowerCase()] } as unknown as Request;
}

describe("requireSeller middleware", () => {
  it("populates req.seller from a valid bearer token", () => {
    const req = mockReq({ authorization: "Bearer tok_seller_rafi" });
    const next = vi.fn() as unknown as NextFunction;
    requireSeller(req, {} as Response, next);
    expect(req.seller).toEqual({ id: "seller_rafi", name: "Rafi Woodcraft" });
    expect(next).toHaveBeenCalledWith();
  });

  it("rejects a request with no token (401)", () => {
    const req = mockReq({});
    const next = vi.fn() as unknown as NextFunction;
    requireSeller(req, {} as Response, next);
    const err = (next as unknown as { mock: { calls: unknown[][] } }).mock.calls[0]![0] as ApiError;
    expect(err).toBeInstanceOf(ApiError);
    expect(err.status).toBe(401);
    expect(req.seller).toBeUndefined();
  });

  it("ignores a non-bearer scheme", () => {
    const req = mockReq({ authorization: "Basic tok_seller_amara" });
    const next = vi.fn() as unknown as NextFunction;
    requireSeller(req, {} as Response, next);
    const err = (next as unknown as { mock: { calls: unknown[][] } }).mock.calls[0]![0] as ApiError;
    expect(err.status).toBe(401);
  });
});
