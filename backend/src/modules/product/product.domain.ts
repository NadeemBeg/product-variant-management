/**
 * Pure, dependency-free domain logic. No Express, no Mongoose — just data in,
 * data out. This is the heart of the feature and the easiest part to test
 * exhaustively, so the risky rules (combination identity, attribute validity,
 * variant resolution) live here rather than tangled into controllers.
 */

export interface OptionDef {
  name: string;
  values: string[];
}

export type Attributes = Record<string, string>;

export interface ResolvableVariant {
  attributes: Attributes;
  available: boolean;
  stock: number;
}

/**
 * Order-independent signature of an attribute set. `{Color:"Red",Size:"M"}` and
 * `{Size:"M",Color:"Red"}` produce the same key, so duplicate combinations are a
 * cheap string equality check regardless of input ordering or casing.
 */
export function combinationKey(attributes: Attributes): string {
  return Object.keys(attributes)
    .map((k) => k.trim().toLowerCase())
    .sort()
    .map((k) => {
      // find original key case-insensitively to read its value
      const originalKey = Object.keys(attributes).find((o) => o.trim().toLowerCase() === k)!;
      return `${k}=${String(attributes[originalKey]).trim().toLowerCase()}`;
    })
    .join("|");
}

export interface AttributeValidationError {
  path: string;
  message: string;
}

/**
 * A variant's attributes are valid iff they name exactly the product's options,
 * once each, with values drawn from each option's declared value list.
 */
export function validateVariantAttributes(
  options: OptionDef[],
  attributes: Attributes,
): AttributeValidationError[] {
  const errors: AttributeValidationError[] = [];
  const optionNames = options.map((o) => o.name);
  const attrKeys = Object.keys(attributes);

  for (const name of optionNames) {
    if (!(name in attributes)) {
      errors.push({ path: `attributes.${name}`, message: `missing value for option "${name}"` });
    }
  }
  for (const key of attrKeys) {
    const option = options.find((o) => o.name === key);
    if (!option) {
      errors.push({ path: `attributes.${key}`, message: `"${key}" is not a declared option` });
      continue;
    }
    if (!option.values.includes(attributes[key]!)) {
      errors.push({
        path: `attributes.${key}`,
        message: `"${attributes[key]}" is not a valid value for "${key}"`,
      });
    }
  }
  return errors;
}

/**
 * Resolve a buyer's partial/complete selection to a single variant.
 * Returns `null` when the selection does not uniquely identify one — the caller
 * decides how to surface "incomplete" vs "invalid" selections.
 */
export function resolveVariant<T extends ResolvableVariant>(
  variants: T[],
  selection: Attributes,
): T | null {
  const matches = variants.filter((v) =>
    Object.entries(selection).every(
      ([k, val]) =>
        v.attributes[k] !== undefined &&
        v.attributes[k]!.toLowerCase() === String(val).toLowerCase(),
    ),
  );
  return matches.length === 1 ? matches[0]! : null;
}

/** A variant is purchasable when it is flagged available and has stock. */
export function isPurchasable(v: ResolvableVariant): boolean {
  return v.available && v.stock > 0;
}

export interface PriceRange {
  min: number;
  max: number;
}

/** Price range across the purchasable variants (falls back to all variants). */
export function priceRange(variants: Array<{ price: number } & ResolvableVariant>): PriceRange | null {
  const pool = variants.filter(isPurchasable);
  const source = pool.length ? pool : variants;
  if (source.length === 0) return null;
  const prices = source.map((v) => v.price);
  return { min: Math.min(...prices), max: Math.max(...prices) };
}
