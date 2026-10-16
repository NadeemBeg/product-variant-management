import { apiFetch } from "./client";
import type { Attributes, Paginated, Product } from "../types";

/* --------------------------- buyer --------------------------- */

export function listProducts(params: { q?: string; category?: string } = {}) {
  const qs = new URLSearchParams();
  if (params.q) qs.set("q", params.q);
  if (params.category) qs.set("category", params.category);
  const suffix = qs.toString() ? `?${qs}` : "";
  return apiFetch<Paginated<Product>>(`/api/products${suffix}`);
}

export function getProduct(id: string) {
  return apiFetch<Product>(`/api/products/${id}`);
}

export function purchaseVariant(productId: string, variantId: string, qty: number) {
  return apiFetch<Product>(`/api/products/${productId}/variants/${variantId}/purchase`, {
    method: "POST",
    body: { qty },
  });
}

/* --------------------------- seller --------------------------- */

export interface VariantInput {
  sku: string;
  attributes: Attributes;
  price: number;
  stock: number;
  available?: boolean;
  images?: { url: string; alt?: string }[];
}

export interface CreateProductInput {
  title: string;
  description?: string;
  category: string;
  status?: "draft" | "published";
  options: { name: string; values: string[] }[];
  variants: VariantInput[];
}

export function listSellerProducts(token: string) {
  return apiFetch<Paginated<Product>>("/api/seller/products", { token });
}

export function getSellerProduct(token: string, id: string) {
  return apiFetch<Product>(`/api/seller/products/${id}`, { token });
}

export function createProduct(token: string, input: CreateProductInput) {
  return apiFetch<Product>("/api/seller/products", { method: "POST", body: input, token });
}

export function updateProduct(
  token: string,
  id: string,
  patch: Partial<Pick<CreateProductInput, "title" | "description" | "category" | "status">>,
) {
  return apiFetch<Product>(`/api/seller/products/${id}`, { method: "PATCH", body: patch, token });
}

export function deleteProduct(token: string, id: string) {
  return apiFetch<void>(`/api/seller/products/${id}`, { method: "DELETE", token });
}

export function updateVariant(
  token: string,
  productId: string,
  variantId: string,
  patch: { price?: number; available?: boolean; sku?: string },
) {
  return apiFetch<Product>(`/api/seller/products/${productId}/variants/${variantId}`, {
    method: "PATCH",
    body: patch,
    token,
  });
}

export function adjustStock(
  token: string,
  productId: string,
  variantId: string,
  change: { set?: number; delta?: number },
) {
  return apiFetch<Product>(`/api/seller/products/${productId}/variants/${variantId}/stock`, {
    method: "PATCH",
    body: change,
    token,
  });
}

export function attachImage(
  token: string,
  productId: string,
  variantId: string,
  image: { url: string; alt?: string },
) {
  return apiFetch<Product>(`/api/seller/products/${productId}/variants/${variantId}/images`, {
    method: "POST",
    body: image,
    token,
  });
}
