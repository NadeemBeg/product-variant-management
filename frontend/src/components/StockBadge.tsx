import { Badge } from "./ui";
import type { Variant } from "../types";

/** Single source of truth for how stock status reads to the buyer. */
export function StockBadge({ variant }: { variant: Variant | null }) {
  if (!variant) return <Badge tone="muted">Select options</Badge>;
  if (!variant.available) return <Badge tone="bad">Unavailable</Badge>;
  if (variant.stock <= 0) return <Badge tone="bad">Out of stock</Badge>;
  if (variant.stock <= 3) return <Badge tone="warn">Only {variant.stock} left</Badge>;
  return <Badge tone="ok">In stock</Badge>;
}
