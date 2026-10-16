import { Link } from "react-router-dom";
import type { Product } from "../types";
import { formatRange } from "../lib/money";
import { Badge } from "./ui";

export function ProductCard({ product }: { product: Product }) {
  const cover = product.variants.find((v) => v.images.length > 0)?.images[0];
  const currency = product.variants[0]?.currency ?? "INR";
  return (
    <Link to={`/product/${product.id}`} className="card">
      <div className="card-media">
        {cover ? <img src={cover.url} alt={product.title} /> : <div className="gallery-placeholder">No image</div>}
        {!product.inStock && <span className="card-ribbon">Sold out</span>}
      </div>
      <div className="card-body">
        <h3 className="card-title">{product.title}</h3>
        <p className="muted">{product.category}</p>
        <div className="card-foot">
          <span className="price">{formatRange(product.priceRange, currency)}</span>
          {product.inStock ? <Badge tone="ok">Available</Badge> : <Badge tone="bad">Sold out</Badge>}
        </div>
      </div>
    </Link>
  );
}
