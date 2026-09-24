export const getProductOptions = (product) => {
  const parse = (value) => (Array.isArray(value) ? value : String(value || "").split(/[;,\n]/))
    .map((option) => String(option).trim()).filter(Boolean);
  return { sizes: parse(product?.sizes), colors: parse(product?.colors) };
};

export const productOptionsAreSelected = (product, selection) => {
  const { sizes, colors } = getProductOptions(product);
  const selected = (!sizes.length || Boolean(selection.size)) && (!colors.length || Boolean(selection.color));
  if (!selected) return false;
  const variants = Array.isArray(product?.variants) ? product.variants : [];
  if (!variants.length) return true;
  return variants.some((variant) => variant.size === (selection.size || "") && variant.color === (selection.color || "") && Number(variant.stock_quantity) > 0);
};

export const hasAvailableOption = (product, key, option, selection) => {
  const variants = Array.isArray(product?.variants) ? product.variants : [];
  if (!variants.length) return true;
  const candidate = { ...selection, [key]: option };
  return variants.some((variant) =>
    (!candidate.size || variant.size === candidate.size) &&
    (!candidate.color || variant.color === candidate.color) &&
    Number(variant.stock_quantity) > 0
  );
};

export const selectedVariantStock = (product, selection) => {
  const variants = Array.isArray(product?.variants) ? product.variants : [];
  if (!variants.length || !productOptionsAreSelected(product, selection)) return null;
  const variant = variants.find((item) => item.size === (selection.size || "") && item.color === (selection.color || ""));
  return variant ? Number(variant.stock_quantity) : 0;
};
