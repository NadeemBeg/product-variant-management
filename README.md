# Product Variant Management System

A working, tested reference implementation of multi-variant product management for an
e-commerce marketplace: sellers create and manage products with variants (colour × size × …),
each with its own images, SKU, price, stock and availability; buyers browse a storefront and
select variants with live price / image / stock updates.

> Built as the reference solution for the *Full-Stack Developer — Product Variant Management*
> take-home task. Stack mirrors the Nakkashii marketplace (Node/Express/MongoDB + React).

```
product-variant-management/
├── backend/     Express + Mongoose + MongoDB API, Zod, Vitest + Supertest
├── frontend/    React + Vite + TypeScript, TanStack Query, React Router
├── NOTES.md         Design decisions, trade-offs, what was cut, what's next
└── EVALUATION.md    Where each rubric point is satisfied, with file pointers
```

## Run it (two terminals)

**1 — API** (needs MongoDB, or point `MONGO_URI` at any instance):

```bash
cd backend
cp .env.example .env
npm install
npm run seed      # demo products
npm run dev       # http://localhost:4000
```

**2 — Web:**

```bash
cd frontend
npm install
npm run dev       # http://localhost:5173
```

Open http://localhost:5173. For the seller portal, "sign in" as a demo seller (auth is stubbed).

> **No MongoDB installed?** You can still run the whole test suite — it boots an in-memory
> MongoDB automatically:
> ```bash
> cd backend && npm install && npm test     # 49 tests, no external services
> cd frontend && npm install && npm test    # 13 tests
> ```

## Highlights

- **Clean layering** — transport → service → data; pure domain logic isolated and unit-tested.
- **Correct concurrency** — stock changes are single conditional atomic updates; a dedicated test
  fires 20 racing buyers at the last 5 units and asserts exactly 5 succeed, stock never negative.
- **Real authorization** — seller identity comes from the bearer token, never the body; ownership
  enforced on every write; cross-seller access returns 404.
- **Dynamic variants** — the buyer UI resolves selections live and disables impossible options; the
  seller UI regenerates the variant grid when options change (add an Nth axis for free).
- **Validated everywhere** — Zod at the boundary, a consistent error envelope, meaningful status codes.
- **Documented** — per-package READMEs, an OpenAPI spec (`backend/docs/openapi.yaml`), and NOTES.

