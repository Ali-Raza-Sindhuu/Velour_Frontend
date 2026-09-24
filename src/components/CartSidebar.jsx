import { useSelector, useDispatch } from "react-redux";
import { Link } from "react-router-dom";
import { X, Minus, Plus, Trash2 } from "lucide-react";
import { toggleCart } from "@/store/slices/uiSlice";
import {
  selectCartItems,
  selectCartTotal,
  updateQty,
  removeItem,
} from "@/store/slices/cartSlice";

export default function CartSidebar() {
  const dispatch = useDispatch();
  const isOpen = useSelector((state) => state.ui.isCartOpen);
  const items = useSelector(selectCartItems);
  const total = useSelector(selectCartTotal);

  const close = () => dispatch(toggleCart());

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex justify-end">
      <div className="absolute inset-0 bg-black/50" onClick={close} />

      <aside className="relative w-full max-w-md h-full bg-white flex flex-col shadow-xl">
        <div className="flex items-center justify-between px-6 py-5 border-b border-border/60">
          <h2 className="font-display text-xl font-semibold">
            Your Cart ({items.reduce((n, i) => n + i.qty, 0)})
          </h2>
          <button aria-label="Close cart" onClick={close} className="hover:opacity-60">
            <X size={22} />
          </button>
        </div>

        {items.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-3 text-center px-6">
            <p className="text-muted-foreground">Your cart is empty.</p>
            <button onClick={close} className="text-sm underline font-medium">
              Continue shopping
            </button>
          </div>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto px-6 py-4 flex flex-col gap-6">
              {items.map((item) => (
                <div key={`${item.id}-${item.size ?? "default"}`} className="flex gap-4">
                  <img
                    src={item.image}
                    alt={item.name}
                    className="w-20 h-24 object-cover rounded-lg flex-shrink-0"
                  />
                  <div className="flex-1 flex flex-col justify-between">
                    <div>
                      <p className="text-sm font-medium">{item.name}</p>
                      {item.size && (
                        <p className="text-xs text-muted-foreground">Size: {item.size}</p>
                      )}
                      <p className="text-sm text-muted-foreground">
                        ${item.price.toFixed(2)}
                      </p>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center border border-border rounded-full">
                        <button
                          aria-label="Decrease quantity"
                          onClick={() =>
                            dispatch(updateQty({ id: item.id, qty: item.qty - 1 }))
                          }
                          className="w-7 h-7 flex items-center justify-center hover:opacity-60"
                        >
                          <Minus size={14} />
                        </button>
                        <span className="w-6 text-center text-sm">{item.qty}</span>
                        <button
                          aria-label="Increase quantity"
                          onClick={() =>
                            dispatch(updateQty({ id: item.id, qty: item.qty + 1 }))
                          }
                          className="w-7 h-7 flex items-center justify-center hover:opacity-60"
                        >
                          <Plus size={14} />
                        </button>
                      </div>
                      <button
                        aria-label="Remove item"
                        onClick={() => dispatch(removeItem({ id: item.id, size: item.size }))}
                        className="text-muted-foreground hover:text-foreground"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="border-t border-border/60 px-6 py-5">
              <div className="flex items-center justify-between mb-4 text-sm">
                <span className="text-muted-foreground">Total</span>
                <span className="font-semibold">${total.toFixed(2)}</span>
              </div>
              <Link
                to="/checkout"
                onClick={close}
                className="block w-full text-center bg-foreground text-background rounded-full py-3 text-sm font-medium"
              >
                Checkout
              </Link>
            </div>
          </>
        )}
      </aside>
    </div>
  );
}
