import { DEMO_SELLERS, useAuth } from "../../hooks/useAuth";

/** Stubbed sign-in: pick a demo seller to obtain their bearer token. */
export function SellerSignIn() {
  const { setToken } = useAuth();
  return (
    <div className="page">
      <h1>Seller portal</h1>
      <p className="muted">
        Authentication is stubbed for this demo. Pick a seller to continue — this stores their bearer
        token and every request is authorised against it.
      </p>
      <div className="signin-row">
        {DEMO_SELLERS.map((s) => (
          <button key={s.token} className="btn-primary" onClick={() => setToken(s.token)}>
            Sign in as {s.name}
          </button>
        ))}
      </div>
    </div>
  );
}
