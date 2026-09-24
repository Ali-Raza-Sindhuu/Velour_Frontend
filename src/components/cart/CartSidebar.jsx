import { useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X, Minus, Plus, Trash2, ShoppingBag } from "lucide-react";
import { useDispatch, useSelector } from "react-redux";
import { Link, useNavigate } from "react-router-dom";
import { removeFromCartThunk as removeFromCart, updateQuantityThunk } from "../../features/cart/cartThunks";
import { resolveImg } from "../../utils/resolveImg";
import { formatPrice } from "../../utils/price";
import FreeShippingBar from "./FreeShippingBar";
import FramedImage from "../ui/FramedImage";

const CartSidebar = ({ isOpen, onClose }) => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const items = useSelector((state) => state.cart?.items) || [];
  const busy = useSelector((state) => state.cart?.loading);
  const subtotal = items.reduce((sum, item) => sum + Number(item.price) * item.quantity, 0);
  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);

  const handleDecrease = (item) => dispatch(updateQuantityThunk({ itemId: item.id, quantity: item.quantity - 1 }));
  const handleIncrease = (item) => dispatch(updateQuantityThunk({ itemId: item.id, quantity: item.quantity + 1 }));
  const handleRemove = (item) => dispatch(removeFromCart(item.id));

  useEffect(() => {
    if (!isOpen) return undefined;
    const onKey = (event) => event.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen, onClose]);

  const go = (path) => {
    onClose();
    navigate(path);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            className="fixed inset-0 z-50 bg-black/20 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.aside
            role="dialog"
            aria-modal="true"
            aria-label="Your bag"
            className="fashion-cart-drawer fixed right-0 top-0 z-50 flex h-full w-full max-w-md flex-col bg-white shadow-2xl"
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="flex items-center justify-between border-b border-black/5 px-6 py-5">
              <h2 className="text-lg font-semibold text-black">
                Your bag {itemCount > 0 && <span className="font-normal text-black/45">({itemCount})</span>}
              </h2>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close bag"
                autoFocus
                className="rounded-full p-1.5 text-black/50 transition hover:bg-black/5 hover:text-black"
              >
                <X size={20} />
              </button>
            </div>

            {items.length > 0 && (
              <FreeShippingBar subtotal={subtotal} className="border-b border-black/5 px-6 py-4" />
            )}

            <div className="flex-1 overflow-y-auto px-6 py-4">
              {items.length === 0 ? (
                <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
                  <div className="grid h-14 w-14 place-items-center rounded-full bg-[#f3f3f3]">
                    <ShoppingBag size={22} className="text-black/40" />
                  </div>
                  <p className="text-base font-medium text-black">Your bag is empty</p>
                  <p className="max-w-[16rem] text-sm text-black/50">Explore the latest pieces and add your favourites to the bag.</p>
                  <button
                    type="button"
                    onClick={() => go("/shops")}
                    className="mt-2 rounded-full bg-black px-6 py-2.5 text-sm font-medium text-white transition hover:bg-black/85"
                  >
                    Shop the collection
                  </button>
                </div>
              ) : (
                <ul className="space-y-5">
                  {items.map((item) => {
                    const atStockLimit = item.stock_quantity != null && item.quantity >= item.stock_quantity;
                    return (
                      <li key={item.id} className="flex gap-4">
                        <Link to={`/shop/${item.slug}`} onClick={onClose} className="shrink-0">
                          <FramedImage
                            src={resolveImg(item.image_url || item.image)}
                            alt={item.name || item.title}
                            depth={false}
                            className="h-20 w-20 rounded-xl bg-[#ededed]"
                          />
                        </Link>
                        <div className="flex min-w-0 flex-1 flex-col">
                          <div className="flex items-start justify-between gap-3">
                            <Link
                              to={`/shop/${item.slug}`}
                              onClick={onClose}
                              className="line-clamp-2 text-sm font-medium text-black hover:underline"
                            >
                              {item.name || item.title}
                            </Link>
                            <button
                              type="button"
                              aria-label={`Remove ${item.name} from bag`}
                              onClick={() => handleRemove(item)}
                              className="shrink-0 text-black/35 transition hover:text-black"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                          {(item.selected_size || item.selected_color) && (
                            <p className="mt-1 text-xs text-black/50">
                              {[item.selected_size && "Size: " + item.selected_size, item.selected_color && "Color: " + item.selected_color].filter(Boolean).join(" · ")}
                            </p>
                          )}
                          <p className="mt-0.5 flex items-center gap-1.5 text-xs tabular-nums text-black/45">
                            <span>{formatPrice(item.price)} each</span>
                            {item.has_discount && <span className="line-through text-black/30">{formatPrice(item.original_price)}</span>}
                          </p>
                          <div className="mt-auto flex items-center justify-between pt-2">
                            <div className="flex items-center rounded-full border border-black/10">
                              <button
                                type="button"
                                aria-label="Decrease quantity"
                                onClick={() => handleDecrease(item)}
                                disabled={busy || item.quantity <= 1}
                                className="grid h-8 w-8 place-items-center text-black/55 transition hover:text-black disabled:opacity-30"
                              >
                                <Minus size={13} />
                              </button>
                              <span className="w-6 text-center text-xs font-medium tabular-nums text-black">{item.quantity}</span>
                              <button
                                type="button"
                                aria-label="Increase quantity"
                                onClick={() => handleIncrease(item)}
                                disabled={busy || atStockLimit}
                                className="grid h-8 w-8 place-items-center text-black/55 transition hover:text-black disabled:opacity-30"
                              >
                                <Plus size={13} />
                              </button>
                            </div>
                            <p className="text-sm font-medium tabular-nums text-black">
                              {formatPrice(Number(item.price) * item.quantity)}
                            </p>
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>

            {items.length > 0 && (
              <div className="border-t border-black/5 px-6 py-5">
                <div className="mb-1 flex items-center justify-between text-sm">
                  <span className="text-black/55">Subtotal</span>
                  <span className="font-medium tabular-nums text-black">{formatPrice(subtotal)}</span>
                </div>
                <p className="mb-4 text-xs text-black/40">Shipping and discount codes are applied at checkout.</p>
                <button
                  type="button"
                  onClick={() => go("/checkout")}
                  className="w-full rounded-full bg-black py-3.5 text-sm font-medium text-white transition hover:bg-black/85 active:scale-[0.99]"
                >
                  Checkout
                </button>
                <button
                  type="button"
                  onClick={() => go("/cart")}
                  className="mt-3 w-full text-center text-xs font-medium text-black/50 underline underline-offset-4 hover:text-black"
                >
                  View full bag
                </button>
              </div>
            )}
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
};

export default CartSidebar;
