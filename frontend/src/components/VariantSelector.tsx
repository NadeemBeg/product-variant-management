import type { Attributes, OptionDef, Variant } from "../types";
import { availableValues } from "../lib/variants";

interface Props {
  options: OptionDef[];
  variants: Variant[];
  selection: Attributes;
  onChange: (next: Attributes) => void;
}

/**
 * Reusable, option-count-agnostic selector. It renders one swatch group per
 * declared option, so a product with a third axis (e.g. Material) needs no code
 * change. Values that can't lead to a purchasable variant given the current
 * selection are disabled rather than hidden, so the buyer sees why.
 */
export function VariantSelector({ options, variants, selection, onChange }: Props) {
  return (
    <div className="selector">
      {options.map((option) => {
        const usable = availableValues(variants, option, selection);
        return (
          <fieldset key={option.name} className="option-group">
            <legend>{option.name}</legend>
            <div className="swatches" role="radiogroup" aria-label={option.name}>
              {option.values.map((value) => {
                const selected = selection[option.name] === value;
                const disabled = !usable.has(value) && !selected;
                return (
                  <button
                    key={value}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    disabled={disabled}
                    className={`swatch${selected ? " is-selected" : ""}${disabled ? " is-disabled" : ""}`}
                    onClick={() => onChange({ ...selection, [option.name]: value })}
                  >
                    {value}
                  </button>
                );
              })}
            </div>
          </fieldset>
        );
      })}
    </div>
  );
}
