# PVMS — Frontend

Storefront (buyer) + seller portal. **React 18 + TypeScript + Vite**, TanStack Query, React Router.

## Quick start

```bash
cd frontend
cp .env.example .env     # optional; blank uses the dev proxy to :4000
npm install
npm run dev              # http://localhost:5173  (proxies /api → http://localhost:4000)
```

Make sure the backend is running (`cd backend && npm run dev`) and seeded (`npm run seed`).

### Scripts

| Script | Does |
|---|---|
| `npm run dev` | Vite dev server with `/api` proxy |
| `npm run build` | Type-check + production build |
| `npm test` | Unit + component tests (Vitest + Testing Library) |
| `npm run typecheck` | `tsc --noEmit` |

## What to look at

- **Buyer — `pages/buyer/ProductDetailPage.tsx`**: pick Color/Size and the image, price,
  stock badge and Buy button update live. Values that can't lead to a purchasable variant are
  disabled, and incomplete/invalid selections are called out. "Buy now" hits the atomic purchase
  endpoint and the stock updates from the response.
- **Seller — `pages/seller/ProductCreatePage.tsx`**: declare options (e.g. add a third axis like
  *Material*) and the variant grid regenerates automatically via `buildMatrix`.
- **Seller — `pages/seller/ProductEditorPage.tsx`**: per-variant price / availability / stock edits
  and image attach, publish/unpublish.

## Reusable pieces

- `components/VariantSelector.tsx` — option-count-agnostic selector (works for 1..N axes).
- `components/StockBadge.tsx`, `ProductCard.tsx`, `ImageGallery.tsx`, `ui.tsx` (Spinner/Empty/Error/Badge).
- `lib/variants.ts` — pure resolution logic (`resolveVariant`, `availableValues`, `selectionState`,
  `buildMatrix`), shared by buyer and seller and unit-tested.

## Auth

Stubbed: pick a demo seller in the portal; the bearer token is stored in `localStorage` and sent
on seller requests. Swap `hooks/useAuth.ts` for a real login and nothing else changes.
