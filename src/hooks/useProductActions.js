import { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { addToCartThunk } from "../features/cart/cartThunks";
import { toggleWishlist } from "../features/wishlist/wishlistSlice";
import { toggleWishlistThunk } from "../features/wishlist/wishlistThunks";
import { openCart } from "../store/slice/Uislice";

export const MAX_PER_ORDER = 10;

// Stock helpers shared by the product card, quick view and product page.
export const stockOf = (product) => Number(product?.stock_quantity ?? 0);
export const isSoldOut = (product) => stockOf(product) <= 0;
export const maxQuantity = (product) => Math.max(1, Math.min(MAX_PER_ORDER, stockOf(product)));

// Add-to-bag, buy-now and wishlist behaviour for a single product. Guests
// can add to bag (the API keeps a guest cart) and wishlist locally; signed-in
// wishlists are synced to the server.
export const useProductActions = (product) => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const isAuthenticated = useSelector((state) => state.auth.isAuthenticated);
  const wishlistSlugs = useSelector((state) => state.wishlist?.items) || [];
  const isWishlisted = Boolean(product?.slug) && wishlistSlugs.includes(product.slug);

  const [pending, setPending] = useState(null); // "add" | "buy" | null
  const [error, setError] = useState("");

  const add = async (quantity, intent, options = {}) => {
    if (!product?.id || pending) return false;
    setPending(intent);
    setError("");
    try {
      await dispatch(addToCartThunk({ productId: product.id, quantity, ...options })).unwrap();
      return true;
    } catch (err) {
      setError(err?.message || "We couldn't add this to your bag. Please try again.");
      return false;
    } finally {
      setPending(null);
    }
  };

  const addToBag = async (quantity = 1, options = {}) => {
    const ok = await add(quantity, "add", options);
    if (ok) dispatch(openCart());
    return ok;
  };

  const buyNow = async (quantity = 1, options = {}) => {
    const ok = await add(quantity, "buy", options);
    if (ok) navigate("/checkout");
    return ok;
  };

  const toggleWish = () => {
    if (!product?.slug) return;
    if (!isAuthenticated) {
      dispatch(toggleWishlist(product.slug));
      return;
    }
    dispatch(toggleWishlistThunk({ productId: product.id, slug: product.slug, isWishlisted }));
  };

  return { addToBag, buyNow, toggleWish, isWishlisted, pending, error, clearError: () => setError("") };
};
