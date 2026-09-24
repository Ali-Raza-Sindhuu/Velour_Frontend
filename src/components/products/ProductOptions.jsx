import { getProductOptions, hasAvailableOption } from "../../utils/productOptions";

const ProductOptions = ({ product, value, onChange }) => {
  const { sizes, colors } = getProductOptions(product);
  if (!sizes.length && !colors.length) return null;

  const update = (key, option) => onChange({ ...value, [key]: option });

  return (
    <div className="mt-5 flex flex-col gap-4">
      {sizes.length > 0 && (
        <fieldset>
          <legend className="mb-2 text-sm font-medium text-black">Size <span className="text-black/40">{value.size ? "· " + value.size : "· Select a size"}</span></legend>
          <div className="flex flex-wrap gap-2">
            {sizes.map((size) => {
              const unavailable = !hasAvailableOption(product, "size", size, value);
              return <button key={size} type="button" disabled={unavailable} aria-pressed={value.size === size} onClick={() => update("size", size)} className={"min-w-11 border px-3 py-2 text-xs transition disabled:cursor-not-allowed disabled:opacity-35 " + (value.size === size ? "border-black bg-black text-white" : "border-black/15 bg-white text-black hover:border-black")}>
                {size}
              </button>;
            })}
          </div>
        </fieldset>
      )}
      {colors.length > 0 && (
        <fieldset>
          <legend className="mb-2 text-sm font-medium text-black">Color <span className="text-black/40">{value.color ? "· " + value.color : "· Select a color"}</span></legend>
          <div className="flex flex-wrap gap-2">
            {colors.map((color) => {
              const unavailable = !hasAvailableOption(product, "color", color, value);
              return <button key={color} type="button" disabled={unavailable} aria-pressed={value.color === color} onClick={() => update("color", color)} className={"border px-3 py-2 text-xs transition disabled:cursor-not-allowed disabled:opacity-35 " + (value.color === color ? "border-black bg-black text-white" : "border-black/15 bg-white text-black hover:border-black")}>
                {color}
              </button>;
            })}
          </div>
        </fieldset>
      )}
    </div>
  );
};

export default ProductOptions;
