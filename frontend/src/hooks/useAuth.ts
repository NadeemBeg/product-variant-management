import { useSyncExternalStore } from "react";

/**
 * Minimal seller "session": the stubbed bearer token lives in localStorage and
 * is swappable between the two demo sellers. In a real app this would be the
 * token issued by the login flow; nothing else in the UI would change.
 */
const KEY = "pvms.sellerToken";

export const DEMO_SELLERS = [
  { token: "tok_seller_amara", name: "Amara Handlooms" },
  { token: "tok_seller_rafi", name: "Rafi Woodcraft" },
];

const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((l) => l());
}

export function setToken(token: string | null): void {
  try {
    if (token) localStorage.setItem(KEY, token);
    else localStorage.removeItem(KEY);
  } catch {
    /* storage unavailable (private mode) — tolerate */
  }
  emit();
}

function getSnapshot(): string | null {
  try {
    return localStorage.getItem(KEY);
  } catch {
    return null;
  }
}

function subscribe(cb: () => void): () => void {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

export function useAuth() {
  const token = useSyncExternalStore(subscribe, getSnapshot, () => null);
  const seller = DEMO_SELLERS.find((s) => s.token === token) ?? null;
  return { token, seller, setToken };
}
