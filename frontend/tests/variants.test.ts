import { describe, expect, it } from "vitest";
import { availableValues, buildMatrix, resolveVariant, selectionState } from "../src/lib/variants";
import type { OptionDef, Variant } from "../src/types";

const options: OptionDef[] = [
  { name: "Color", values: ["Red", "Blue"] },
  { name: "Size", values: ["S", "M"] },
];

function variant(attrs: Record<string, string>, stock: number, available = true): Variant {
  return {
    id: Object.values(attrs).join("-"),
    sku: Object.values(attrs).join("-"),
    attributes: attrs,
    price: 100,
    currency: "INR",
    stock,
    available,
    purchasable: available && stock > 0,
    images: [],
  };
}

const variants: Variant[] = [
  variant({ Color: "Red", Size: "S" }, 5),
  variant({ Color: "Red", Size: "M" }, 0), // out of stock
  variant({ Color: "Blue", Size: "S" }, 2, false), // unavailable
  variant({ Color: "Blue", Size: "M" }, 3),
];

describe("resolveVariant", () => {
  it("resolves a complete selection", () => {
    expect(resolveVariant(variants, { Color: "Red", Size: "S" })?.stock).toBe(5);
  });
  it("returns null when incomplete", () => {
    expect(resolveVariant(variants, { Color: "Red" })).toBeNull();
  });
  it("returns null when the combination does not exist", () => {
    expect(resolveVariant([variants[0]!], { Color: "Blue", Size: "M" })).toBeNull();
  });
});

describe("availableValues", () => {
  it("marks a size unusable when its only variant for the chosen colour is out of stock", () => {
    // Red + M is out of stock, so with Color=Red, Size M is not usable.
    const usable = availableValues(variants, options[1]!, { Color: "Red" });
    expect(usable.has("S")).toBe(true);
    expect(usable.has("M")).toBe(false);
  });

  it("excludes a colour whose matching variant is flagged unavailable", () => {
    // Blue + S is unavailable, Blue + M is fine → Blue stays usable overall at Size S? no.
    const usable = availableValues(variants, options[0]!, { Size: "S" });
    expect(usable.has("Red")).toBe(true);
    expect(usable.has("Blue")).toBe(false); // Blue/S is unavailable
  });
});

describe("selectionState", () => {
  it("is incomplete until every option is chosen", () => {
    expect(selectionState(options, variants, { Color: "Red" })).toBe("incomplete");
  });
  it("is complete for a resolvable selection", () => {
    expect(selectionState(options, variants, { Color: "Red", Size: "S" })).toBe("complete");
  });
  it("is invalid for a complete but non-existent combination", () => {
    const two = [variant({ Color: "Red", Size: "S" }, 5), variant({ Color: "Blue", Size: "M" }, 1)];
    expect(selectionState(options, two, { Color: "Red", Size: "M" })).toBe("invalid");
  });
});

describe("buildMatrix", () => {
  it("produces the cartesian product of option values", () => {
    const matrix = buildMatrix(options);
    expect(matrix).toHaveLength(4);
    expect(matrix).toContainEqual({ Color: "Red", Size: "S" });
    expect(matrix).toContainEqual({ Color: "Blue", Size: "M" });
  });

  it("scales to a third axis", () => {
    const three = [...options, { name: "Material", values: ["Silk", "Cotton", "Wool"] }];
    expect(buildMatrix(three)).toHaveLength(2 * 2 * 3);
  });
});
