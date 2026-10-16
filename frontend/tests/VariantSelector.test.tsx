import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { VariantSelector } from "../src/components/VariantSelector";
import type { OptionDef, Variant } from "../src/types";

const options: OptionDef[] = [
  { name: "Color", values: ["Red", "Blue"] },
  { name: "Size", values: ["S", "M"] },
];

const mk = (attrs: Record<string, string>, stock: number, available = true): Variant => ({
  id: Object.values(attrs).join("-"),
  sku: Object.values(attrs).join("-"),
  attributes: attrs,
  price: 100,
  currency: "INR",
  stock,
  available,
  purchasable: available && stock > 0,
  images: [],
});

const variants: Variant[] = [
  mk({ Color: "Red", Size: "S" }, 5),
  mk({ Color: "Red", Size: "M" }, 0), // out of stock
  mk({ Color: "Blue", Size: "S" }, 4),
  mk({ Color: "Blue", Size: "M" }, 4),
];

describe("<VariantSelector />", () => {
  it("renders a group per option and marks the current selection", () => {
    render(<VariantSelector options={options} variants={variants} selection={{ Color: "Red" }} onChange={() => {}} />);
    expect(screen.getByRole("radiogroup", { name: "Color" })).toBeInTheDocument();
    expect(screen.getByRole("radiogroup", { name: "Size" })).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: "Red" })).toHaveAttribute("aria-checked", "true");
  });

  it("emits the updated selection when a value is clicked", async () => {
    const onChange = vi.fn();
    render(<VariantSelector options={options} variants={variants} selection={{ Color: "Red" }} onChange={onChange} />);
    await userEvent.click(screen.getByRole("radio", { name: "S" }));
    expect(onChange).toHaveBeenCalledWith({ Color: "Red", Size: "S" });
  });

  it("disables a value that cannot lead to a purchasable variant", () => {
    // With Color=Red selected, Size M (Red/M stock 0) must be disabled.
    render(<VariantSelector options={options} variants={variants} selection={{ Color: "Red" }} onChange={() => {}} />);
    expect(screen.getByRole("radio", { name: "M" })).toBeDisabled();
    expect(screen.getByRole("radio", { name: "S" })).toBeEnabled();
  });
});
