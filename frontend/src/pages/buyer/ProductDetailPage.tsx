import { useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getProduct, purchaseVariant } from "../../api/products";
import { resolveVariant, selectionState } from "../../lib/variants";
import { formatMoney, formatRange } from "../../lib/money";
import { VariantSelector } from "../../components/VariantSelector";
import { ImageGallery } from "../../components/ImageGallery";
import { StockBadge } from "../../components/StockBadge";
import { ErrorState, Spinner } from "../../components/ui";
import { ApiError } from "../../api/client";
import type { Attributes, Product } from "../../types";

export function ProductDetailPage() {
  const { id = "" } = useParams();
  const queryClient = useQueryClient();
  const [selection, setSelection] = useState<Attributes>({});
  const [qty, setQty] = useState(1);
  const [flash, setFlash] = useState<string | null>(null);

  const { data: product, isPending, isError, error } = useQuery({
    queryKey: ["product", id],
    queryFn: () => getProduct(id),
  });

  // Default the selection to the first purchasable variant for a sensible landing state.
  const initialised = useMemo(() => Object.keys(selection).length > 0, [selection]);
  if (product && !initialised) {
    const first = product.variants.find((v) => v.purchasable) ?? product.variants[0];
    if (first) setSelection({ ...first.attributes });
  }

  const purchase = useMutation({
    mutationFn: (variantId: string) => purchaseVariant(id, variantId, qty),
    onSuccess: (updated) => {
      queryClient.setQueryData(["product", id], updated);
      setFlash(`Purchased ${qty} × ${resolveVariant(updated.variants, selection)?.sku ?? ""}`);
    },
  });

  if (isPending) return <Spinner />;
  if (isError) return <ErrorState error={error} />;

  return <Detail product={product} selection={selection} setSelection={setSelection} qty={qty} setQty={setQty} flash={flash} purchase={purchase} />;
}

interface DetailProps {
  product: Product;
  selection: Attributes;
  setSelection: (a: Attributes) => void;
  qty: number;
  setQty: (n: number) => void;
  flash: string | null;
  purchase: ReturnType<typeof useMutation<Product, Error, string>>;
}

function Detail({ product, selection, setSelection, qty, setQty, flash, purchase }: DetailProps) {
  const variant = resolveVariant(product.variants, selection);
  const state = selectionState(product.options, product.variants, selection);
  const currency = variant?.currency ?? product.variants[0]?.currency ?? "INR";
  const canBuy = state === "complete" && !!variant?.purchasable && qty > 0 && qty <= (variant?.stock ?? 0);

  const images = variant?.images.length ? variant.images : product.variants.find((v) => v.images.length)?.images ?? [];

  return (
    <div className="page">
      <Link to="/" className="back">← Back to storefront</Link>
      <div className="detail">
        <ImageGallery images={images} title={product.title} />

        <div className="detail-info">
          <h1>{product.title}</h1>
          <p className="muted">{product.category}</p>
          <p>{product.description}</p>

          <div className="price-row">
            <span className="price price-lg">
              {variant ? formatMoney(variant.price, currency) : formatRange(product.priceRange, currency)}
            </span>
            <StockBadge variant={variant} />
          </div>

          <VariantSelector
            options={product.options}
            variants={product.variants}
            selection={selection}
            onChange={setSelection}
          />

          {state === "incomplete" && (
            <p className="hint">Select {product.options.map((o) => o.name).join(" and ")} to continue.</p>
          )}
          {state === "invalid" && (
            <p className="hint hint-bad">This combination isn’t available. Try a different option.</p>
          )}

          <div className="buy-row">
            <label className="qty">
              Qty
              <input
                type="number"
                min={1}
                max={variant?.stock ?? 1}
                value={qty}
                onChange={(e) => setQty(Math.max(1, Number(e.target.value) || 1))}
                disabled={!variant?.purchasable}
              />
            </label>
            <button
              type="button"
              className="btn-primary"
              disabled={!canBuy || purchase.isPending}
              onClick={() => variant && purchase.mutate(variant.id)}
            >
              {purchase.isPending ? "Processing…" : "Buy now"}
            </button>
          </div>

          {variant && <p className="muted small">SKU: {variant.sku}</p>}
          {flash && <p className="flash">{flash}</p>}
          {purchase.isError && (
            <p className="hint hint-bad">
              {purchase.error instanceof ApiError && purchase.error.code === "INSUFFICIENT_STOCK"
                ? "Sorry — that just sold out."
                : "Could not complete the purchase."}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
