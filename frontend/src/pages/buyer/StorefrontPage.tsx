import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { listProducts } from "../../api/products";
import { ProductCard } from "../../components/ProductCard";
import { EmptyState, ErrorState, Spinner } from "../../components/ui";

export function StorefrontPage() {
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");

  const { data, isPending, isError, error } = useQuery({
    queryKey: ["products", query],
    queryFn: () => listProducts({ q: query || undefined }),
  });

  return (
    <div className="page">
      <header className="page-head">
        <div>
          <h1>Storefront</h1>
          <p className="muted">Browse products and pick a variant.</p>
        </div>
        <form
          className="search"
          onSubmit={(e) => {
            e.preventDefault();
            setQuery(search.trim());
          }}
        >
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search products…"
            aria-label="Search products"
          />
          <button type="submit">Search</button>
        </form>
      </header>

      {isPending ? (
        <Spinner />
      ) : isError ? (
        <ErrorState error={error} />
      ) : data.items.length === 0 ? (
        <EmptyState title="No products found" hint="Try a different search, or seed the demo data." />
      ) : (
        <div className="grid">
          {data.items.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      )}
    </div>
  );
}
