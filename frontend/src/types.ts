/** API DTOs — mirror of the backend presenter output. */

export type Attributes = Record<string, string>;

export interface VariantImage {
  id: string;
  url: string;
  alt: string;
}

export interface Variant {
  id: string;
  sku: string;
  attributes: Attributes;
  price: number;
  currency: string;
  stock: number;
  available: boolean;
  purchasable: boolean;
  images: VariantImage[];
}

export interface OptionDef {
  name: string;
  values: string[];
}

export interface PriceRange {
  min: number;
  max: number;
}

export interface Product {
  id: string;
  sellerId: string;
  title: string;
  description: string;
  category: string;
  status: "draft" | "published";
  options: OptionDef[];
  variants: Variant[];
  priceRange: PriceRange | null;
  inStock: boolean;
  version: number;
  createdAt: string;
  updatedAt: string;
}

export interface Paginated<T> {
  items: T[];
  pagination: { total: number; page: number; limit: number; pages: number };
}

export interface ApiErrorShape {
  error: { code: string; message: string; details?: unknown };
}
