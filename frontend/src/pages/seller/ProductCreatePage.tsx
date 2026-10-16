import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createProduct, type CreateProductInput, type VariantInput } from "../../api/products";
import { buildMatrix } from "../../lib/variants";
import { useAuth } from "../../hooks/useAuth";
import { ErrorState } from "../../components/ui";
import { SellerSignIn } from "./SellerSignIn";
import type { Attributes } from "../../types";

interface OptionDraft {
  name: string;
  valuesText: string; // comma-separated, parsed on the fly
}

interface RowDraft {
  sku: string;
  price: string;
  stock: string;
}

const keyOf = (attrs: Attributes) =>
  Object.keys(attrs)
    .sort()
    .map((k) => `${k}=${attrs[k]}`)
    .join("|");

export function ProductCreatePage() {
  const { token } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState<"draft" | "published">("draft");
  const [options, setOptions] = useState<OptionDraft[]>([{ name: "Color", valuesText: "Red, Blue" }]);
  const [rows, setRows] = useState<Record<string, RowDraft>>({});
  const [formError, setFormError] = useState<string | null>(null);

  const parsedOptions = useMemo(
    () =>
      options
        .map((o) => ({
          name: o.name.trim(),
          values: o.valuesText.split(",").map((v) => v.trim()).filter(Boolean),
        }))
        .filter((o) => o.name && o.values.length > 0),
    [options],
  );

  const matrix = useMemo(() => buildMatrix(parsedOptions), [parsedOptions]);

  const create = useMutation({
    mutationFn: (input: CreateProductInput) => createProduct(token!, input),
    onSuccess: (product) => {
      queryClient.invalidateQueries({ queryKey: ["seller-products"] });
      navigate(`/seller/products/${product.id}`);
    },
  });

  if (!token) return <SellerSignIn />;

  const row = (attrs: Attributes): RowDraft => rows[keyOf(attrs)] ?? { sku: "", price: "", stock: "0" };
  const setRow = (attrs: Attributes, patch: Partial<RowDraft>) =>
    setRows((prev) => ({ ...prev, [keyOf(attrs)]: { ...row(attrs), ...patch } }));

  const submit = () => {
    setFormError(null);
    if (!title.trim() || !category.trim()) return setFormError("Title and category are required.");
    if (parsedOptions.length === 0) return setFormError("Declare at least one option with values.");
    if (matrix.length === 0) return setFormError("No variant combinations to create.");

    const variants: VariantInput[] = [];
    for (const attrs of matrix) {
      const r = row(attrs);
      if (!r.sku.trim()) return setFormError(`Every variant needs a SKU (missing for ${keyOf(attrs)}).`);
      variants.push({
        sku: r.sku.trim(),
        attributes: attrs,
        price: Number(r.price) || 0,
        stock: Math.max(0, Math.trunc(Number(r.stock) || 0)),
      });
    }

    create.mutate({
      title: title.trim(),
      description: description.trim(),
      category: category.trim(),
      status,
      options: parsedOptions,
      variants,
    });
  };

  return (
    <div className="page">
      <h1>New product</h1>

      <section className="form-grid">
        <label>Title<input value={title} onChange={(e) => setTitle(e.target.value)} /></label>
        <label>Category<input value={category} onChange={(e) => setCategory(e.target.value)} /></label>
        <label className="span-2">Description
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} />
        </label>
        <label>Status
          <select value={status} onChange={(e) => setStatus(e.target.value as "draft" | "published")}>
            <option value="draft">draft</option>
            <option value="published">published</option>
          </select>
        </label>
      </section>

      <section>
        <div className="section-head">
          <h2>Options</h2>
          <button type="button" onClick={() => setOptions((o) => [...o, { name: "", valuesText: "" }])}>
            + Add option
          </button>
        </div>
        {options.map((opt, i) => (
          <div key={i} className="option-row">
            <input
              placeholder="Option name (e.g. Size)"
              value={opt.name}
              onChange={(e) => setOptions((o) => o.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)))}
            />
            <input
              placeholder="Values, comma separated (e.g. S, M, L)"
              value={opt.valuesText}
              onChange={(e) => setOptions((o) => o.map((x, j) => (j === i ? { ...x, valuesText: e.target.value } : x)))}
            />
            {options.length > 1 && (
              <button type="button" onClick={() => setOptions((o) => o.filter((_, j) => j !== i))}>Remove</button>
            )}
          </div>
        ))}
        <p className="muted small">Add a third option and the variant grid regenerates automatically.</p>
      </section>

      <section>
        <h2>Variants ({matrix.length})</h2>
        {matrix.length === 0 ? (
          <p className="muted">Define options above to generate variant rows.</p>
        ) : (
          <table className="table">
            <thead>
              <tr>
                {parsedOptions.map((o) => <th key={o.name}>{o.name}</th>)}
                <th>SKU</th>
                <th>Price</th>
                <th>Stock</th>
              </tr>
            </thead>
            <tbody>
              {matrix.map((attrs) => {
                const r = row(attrs);
                return (
                  <tr key={keyOf(attrs)}>
                    {parsedOptions.map((o) => <td key={o.name}>{attrs[o.name]}</td>)}
                    <td><input value={r.sku} onChange={(e) => setRow(attrs, { sku: e.target.value })} /></td>
                    <td><input type="number" min={0} value={r.price} onChange={(e) => setRow(attrs, { price: e.target.value })} /></td>
                    <td><input type="number" min={0} value={r.stock} onChange={(e) => setRow(attrs, { stock: e.target.value })} /></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </section>

      {formError && <p className="hint hint-bad">{formError}</p>}
      {create.isError && <ErrorState error={create.error} />}

      <div className="buy-row">
        <button type="button" className="btn-primary" onClick={submit} disabled={create.isPending}>
          {create.isPending ? "Creating…" : "Create product"}
        </button>
        <button type="button" onClick={() => navigate("/seller")}>Cancel</button>
      </div>
    </div>
  );
}
