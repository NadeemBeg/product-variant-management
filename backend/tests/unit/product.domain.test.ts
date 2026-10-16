import { describe, expect, it } from "vitest";
import {
  combinationKey,
  isPurchasable,
  priceRange,
  resolveVariant,
  validateVariantAttributes,
} from "../../src/modules/product/product.domain.js";

describe("combinationKey", () => {
  it("is independent of attribute ordering", () => {
    expect(combinationKey({ Color: "Red", Size: "M" })).toBe(combinationKey({ Size: "M", Color: "Red" }));
  });

  it("is case-insensitive", () => {
    expect(combinationKey({ Color: "RED", Size: "m" })).toBe(combinationKey({ color: "red", size: "M" }));
  });

  it("distinguishes different combinations", () => {
    expect(combinationKey({ Color: "Red", Size: "M" })).not.toBe(combinationKey({ Color: "Red", Size: "S" }));
  });
});

describe("validateVariantAttributes", () => {
  const options = [
    { name: "Color", values: ["Red", "Blue"] },
    { name: "Size", values: ["S", "M"] },
  ];

  it("accepts a valid, complete attribute set", () => {
    expect(validateVariantAttributes(options, { Color: "Red", Size: "M" })).toEqual([]);
  });

  it("flags a missing option", () => {
    const errors = validateVariantAttributes(options, { Color: "Red" });
    expect(errors).toContainEqual({ path: "attributes.Size", message: expect.stringContaining("missing") });
  });

  it("flags an undeclared option", () => {
    const errors = validateVariantAttributes(options, { Color: "Red", Size: "M", Material: "Silk" });
    expect(errors.some((e) => e.path === "attributes.Material")).toBe(true);
  });

  it("flags an out-of-range value", () => {
    const errors = validateVariantAttributes(options, { Color: "Green", Size: "M" });
    expect(errors.some((e) => e.message.includes("Green"))).toBe(true);
  });
});

describe("resolveVariant", () => {
  const variants = [
    { attributes: { Color: "Red", Size: "S" }, available: true, stock: 5 },
    { attributes: { Color: "Red", Size: "M" }, available: true, stock: 0 },
    { attributes: { Color: "Blue", Size: "S" }, available: false, stock: 2 },
  ];

  it("resolves a complete selection to one variant", () => {
    expect(resolveVariant(variants, { Color: "Red", Size: "S" })?.stock).toBe(5);
  });

  it("returns null for a selection that matches no variant", () => {
    expect(resolveVariant(variants, { Color: "Blue", Size: "M" })).toBeNull();
  });

  it("returns null for an ambiguous (incomplete) selection", () => {
    expect(resolveVariant(variants, { Color: "Red" })).toBeNull();
  });

  it("is case-insensitive on values", () => {
    expect(resolveVariant(variants, { Color: "red", Size: "s" })?.stock).toBe(5);
  });
});

describe("isPurchasable", () => {
  it("is false when out of stock", () => {
    expect(isPurchasable({ available: true, stock: 0, attributes: {} })).toBe(false);
  });
  it("is false when flagged unavailable", () => {
    expect(isPurchasable({ available: false, stock: 10, attributes: {} })).toBe(false);
  });
  it("is true when available and in stock", () => {
    expect(isPurchasable({ available: true, stock: 1, attributes: {} })).toBe(true);
  });
});

describe("priceRange", () => {
  it("spans purchasable variants only when some are purchasable", () => {
    const range = priceRange([
      { price: 100, available: true, stock: 5, attributes: {} },
      { price: 200, available: true, stock: 0, attributes: {} }, // out of stock, ignored
      { price: 150, available: true, stock: 2, attributes: {} },
    ]);
    expect(range).toEqual({ min: 100, max: 150 });
  });

  it("falls back to all variants when none are purchasable", () => {
    const range = priceRange([
      { price: 100, available: true, stock: 0, attributes: {} },
      { price: 150, available: false, stock: 5, attributes: {} },
    ]);
    expect(range).toEqual({ min: 100, max: 150 });
  });

  it("returns null with no variants", () => {
    expect(priceRange([])).toBeNull();
  });
});
