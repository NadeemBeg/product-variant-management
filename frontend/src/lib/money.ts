import type { PriceRange } from "../types";

const formatters = new Map<string, Intl.NumberFormat>();

function fmt(currency: string): Intl.NumberFormat {
  let f = formatters.get(currency);
  if (!f) {
    f = new Intl.NumberFormat("en-IN", { style: "currency", currency, maximumFractionDigits: 0 });
    formatters.set(currency, f);
  }
  return f;
}

export function formatMoney(amount: number, currency = "INR"): string {
  try {
    return fmt(currency).format(amount);
  } catch {
    return `${currency} ${amount}`;
  }
}

export function formatRange(range: PriceRange | null, currency = "INR"): string {
  if (!range) return "—";
  if (range.min === range.max) return formatMoney(range.min, currency);
  return `${formatMoney(range.min, currency)} – ${formatMoney(range.max, currency)}`;
}
