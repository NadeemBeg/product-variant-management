import { NavLink, Route, Routes } from "react-router-dom";
import { StorefrontPage } from "./pages/buyer/StorefrontPage";
import { ProductDetailPage } from "./pages/buyer/ProductDetailPage";
import { SellerProductsPage } from "./pages/seller/SellerProductsPage";
import { ProductCreatePage } from "./pages/seller/ProductCreatePage";
import { ProductEditorPage } from "./pages/seller/ProductEditorPage";
import { useAuth } from "./hooks/useAuth";

export default function App() {
  const { seller, setToken } = useAuth();
  return (
    <div className="app">
      <nav className="nav">
        <span className="brand">Nakkashii · Variants</span>
        <div className="nav-links">
          <NavLink to="/" end>Storefront</NavLink>
          <NavLink to="/seller">Seller portal</NavLink>
        </div>
        <div className="nav-auth">
          {seller ? (
            <>
              <span className="muted small">{seller.name}</span>
              <button type="button" onClick={() => setToken(null)}>Sign out</button>
            </>
          ) : (
            <span className="muted small">Not signed in</span>
          )}
        </div>
      </nav>

      <main>
        <Routes>
          <Route path="/" element={<StorefrontPage />} />
          <Route path="/product/:id" element={<ProductDetailPage />} />
          <Route path="/seller" element={<SellerProductsPage />} />
          <Route path="/seller/new" element={<ProductCreatePage />} />
          <Route path="/seller/products/:id" element={<ProductEditorPage />} />
          <Route path="*" element={<div className="page"><h1>Not found</h1></div>} />
        </Routes>
      </main>
    </div>
  );
}
