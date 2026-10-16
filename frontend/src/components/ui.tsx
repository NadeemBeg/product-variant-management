import type { ReactNode } from "react";
import { ApiError } from "../api/client";

export function Spinner({ label = "Loading…" }: { label?: string }) {
  return (
    <div className="state" role="status" aria-live="polite">
      <span className="spinner" aria-hidden /> {label}
    </div>
  );
}

export function EmptyState({ title, hint }: { title: string; hint?: ReactNode }) {
  return (
    <div className="state">
      <p className="state-title">{title}</p>
      {hint && <p className="muted">{hint}</p>}
    </div>
  );
}

export function ErrorState({ error }: { error: unknown }) {
  const message =
    error instanceof ApiError
      ? `${error.message}${error.code ? ` (${error.code})` : ""}`
      : error instanceof Error
        ? error.message
        : "Something went wrong";
  return (
    <div className="state state-error" role="alert">
      {message}
    </div>
  );
}

export function Badge({ tone, children }: { tone: "ok" | "warn" | "bad" | "muted"; children: ReactNode }) {
  return <span className={`badge badge-${tone}`}>{children}</span>;
}
