import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  adjustStock,
  attachImage,
  getSellerProduct,
  updateProduct,
  updateVariant,
} from "../../api/products";
import { useAuth } from "../../hooks/useAuth";
import { Badge, ErrorState, Spinner } from "../../components/ui";
import { formatMoney } from "../../lib/money";
import { SellerSignIn } from "./SellerSignIn";
import type { Product, Variant } from "../../types";

export function ProductEditorPage() {
  const { id = "" } = useParams();
  const { token } = useAuth();
  const queryClient = useQueryClient();

  const { data: product, isPending, isError, error } = useQuery({
    queryKey: ["seller-product", id, token],
    queryFn: () => getSellerProduct(token!, id),
    enabled: !!token,
  });

  const apply = (updated: Product) => {
    queryClient.setQueryData(["seller-product", id, token], updated);
    queryClient.invalidateQueries({ queryKey: ["seller-products"] });
  };

  const statusMut = useMutation({
    mutationFn: (status: "draft" | "published") => updateProduct(token!, id, { status }),
    onSuccess: apply,
  });

  if (!token) return <SellerSignIn />;
  if (isPending) return <Spinner />;
  if (isError) return <ErrorState error={error} />;

  return (
    <div className="page">
      <Link to="/seller" className="back">← Back to products</Link>
      <header className="page-head">
        <div>
          <h1>{product.title}</h1>
          <p className="muted">{product.category} · v{product.version}</p>
        </div>
        <div className="buy-row">
          <Badge tone={product.status === "published" ? "ok" : "muted"}>{product.status}</Badge>
          <button
            type="button"
            onClick={() => statusMut.mutate(product.status === "published" ? "draft" : "published")}
            disabled={statusMut.isPending}
          >
            {product.status === "published" ? "Unpublish" : "Publish"}
          </button>
        </div>
      </header>

      <table className="table">
        <thead>
          <tr>
            <th>Variant</th>
            <th>SKU</th>
            <th>Price</th>
            <th>Stock</th>
            <th>Available</th>
            <th>Image</th>
          </tr>
        </thead>
        <tbody>
          {product.variants.map((v) => (
            <VariantRow key={v.id} productId={id} token={token} variant={v} onChange={apply} />
          ))}
        </tbody>
      </table>
    </div>
  );
}

function VariantRow({
  productId,
  token,
  variant,
  onChange,
}: {
  productId: string;
  token: string;
  variant: Variant;
  onChange: (p: Product) => void;
}) {
  const [price, setPrice] = useState(String(variant.price));
  const [stock, setStock] = useState(String(variant.stock));
  const [imageUrl, setImageUrl] = useState("");

  const priceMut = useMutation({
    mutationFn: () => updateVariant(token, productId, variant.id, { price: Number(price) || 0 }),
    onSuccess: onChange,
  });
  const availMut = useMutation({
    mutationFn: (available: boolean) => updateVariant(token, productId, variant.id, { available }),
    onSuccess: onChange,
  });
  const stockMut = useMutation({
    mutationFn: () => adjustStock(token, productId, variant.id, { set: Math.max(0, Number(stock) || 0) }),
    onSuccess: onChange,
  });
  const imageMut = useMutation({
    mutationFn: () => attachImage(token, productId, variant.id, { url: imageUrl.trim() }),
    onSuccess: (p) => {
      setImageUrl("");
      onChange(p);
    },
  });

  const label = Object.entries(variant.attributes)
    .map(([k, val]) => `${k}: ${val}`)
    .join(", ");

  return (
    <tr>
      <td>
        {label}
        <div className="muted small">{formatMoney(variant.price, variant.currency)}</div>
      </td>
      <td>{variant.sku}</td>
      <td>
        <div className="inline">
          <input type="number" min={0} value={price} onChange={(e) => setPrice(e.target.value)} />
          <button type="button" onClick={() => priceMut.mutate()} disabled={priceMut.isPending}>Save</button>
        </div>
      </td>
      <td>
        <div className="inline">
          <input type="number" min={0} value={stock} onChange={(e) => setStock(e.target.value)} />
          <button type="button" onClick={() => stockMut.mutate()} disabled={stockMut.isPending}>Set</button>
        </div>
      </td>
      <td>
        <label className="switch">
          <input
            type="checkbox"
            checked={variant.available}
            onChange={(e) => availMut.mutate(e.target.checked)}
          />
          {variant.available ? "Yes" : "No"}
        </label>
      </td>
      <td>
        <div className="inline">
          <input placeholder="Image URL" value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} />
          <button
            type="button"
            onClick={() => imageMut.mutate()}
            disabled={!imageUrl.trim() || imageMut.isPending}
          >
            Add
          </button>
        </div>
        <div className="muted small">{variant.images.length} image(s)</div>
      </td>
    </tr>
  );
}
