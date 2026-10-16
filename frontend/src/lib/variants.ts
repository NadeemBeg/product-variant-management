import type { Attributes, OptionDef, Variant } from "../types";

/**
 * Pure variant logic shared by the buyer and seller UIs. Kept framework-free so
 * it can be unit-tested in isolation — this is the behaviour the buyer panel
 * lives or dies on.
 */

/** Resolve a (possibly partial) selection to exactly one variant, else null. */
export function resolveVariant(variants: Variant[], selection: Attributes): Variant | null {
  const matches = variants.filter((v) =>
    Object.entries(selection).every(
      ([k, val]) => v.attributes[k]?.toLowerCase() === String(val).toLowerCase(),
    ),
  );
  return matches.length === 1 ? matches[0]! : null;
}

/**
 * For a given option while others are held fixed, which of its values still lead
 * to at least one *purchasable* variant. Powers "grey out the sold-out size"
 * without the buyer having to click to discover it.
 */
export function availableValues(
  variants: Variant[],
  option: OptionDef,
  selection: Attributes,
): Set<string> {
  const others = { ...selection };
  delete others[option.name];
  const usable = new Set<string>();
  for (const value of option.values) {
    const candidate = { ...others, [option.name]: value };
    const matched = variants.filter((v) =>
      Object.entries(candidate).every(([k, val]) => v.attributes[k] === val),
    );
    if (matched.some((v) => v.purchasable)) usable.add(value);
  }
  return usable;
}

export type SelectionState = "complete" | "incomplete" | "invalid";

/** Classify a selection relative to the product's declared options. */
export function selectionState(
  options: OptionDef[],
  variants: Variant[],
  selection: Attributes,
): SelectionState {
  const chosen = Object.keys(selection).filter((k) => selection[k]);
  if (chosen.length < options.length) return "incomplete";
  return resolveVariant(variants, selection) ? "complete" : "invalid";
}

/** Cartesian product of option values → every attribute combination. */
export function buildMatrix(options: OptionDef[]): Attributes[] {
  if (options.length === 0) return [];
  return options.reduce<Attributes[]>(
    (acc, option) =>
      acc.flatMap((row) => option.values.map((value) => ({ ...row, [option.name]: value }))),
    [{}],
  );
}
