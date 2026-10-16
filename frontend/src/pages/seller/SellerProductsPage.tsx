import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { listSellerProducts } from "../../api/products";
import { useAuth } from "../../hooks/useAuth";
import { formatRange } from "../../lib/money";
import { Badge, EmptyState, ErrorState, Spinner } from "../../components/ui";
import { SellerSignIn } from "./SellerSignIn";

export function SellerProductsPage() {
  const { token, seller } = useAuth();

  const { data, isPending, isError, error } = useQuery({
    queryKey: ["seller-products", token],
    queryFn: () => listSellerProducts(token!),
    enabled: !!token,
  });

  if (!token) return <SellerSignIn />;

  return (
    <div className="page">
      <header className="page-head">
        <div>
          <h1>Your products</h1>
          <p className="muted">Signed in as {seller?.name}</p>
        </div>
        <Link to="/seller/new" className="btn-primary">+ New product</Link>
      </header>

      {isPending ? (
        <Spinner />
      ) : isError ? (
        <ErrorState error={error} />
      ) : data.items.length === 0 ? (
        <EmptyState title="No products yet" hint="Create your first product to add variants." />
      ) : (
        <table className="table">
          <thead>
            <tr>
              <th>Title</th>
              <th>Category</th>
              <th>Status</th>
              <th>Variants</th>
              <th>Price</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {data.items.map((p) => (
              <tr key={p.id}>
                <td>{p.title}</td>
                <td>{p.category}</td>
                <td>
                  <Badge tone={p.status === "published" ? "ok" : "muted"}>{p.status}</Badge>
                </td>
                <td>{p.variants.length}</td>
                <td>{formatRange(p.priceRange, p.variants[0]?.currency)}</td>
                <td>
                  <Link to={`/seller/products/${p.id}`}>Edit</Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
