import { useDispatch } from "react-redux";
import { Plus } from "lucide-react";
import { addItem } from "@/store/slices/cartSlice";

export default function ProductCard({ product }) {
  const dispatch = useDispatch();
  const { id, name, price, compareAtPrice, image, tag } = product;

  const handleAddToCart = (e) => {
    e.preventDefault();
    dispatch(addItem({ id, name, price, image, size: "M", qty: 1 }));
  };

  return (
    <a href={`/product/${id}`} className="group block">
      <div className="relative aspect-[3/4] overflow-hidden bg-muted mb-4">
        <img
          src={image}
          alt={name}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
        />

        {tag && (
          <span className="absolute top-3 left-3 bg-white px-3 py-1 text-xs font-medium tracking-wide">
            {tag}
          </span>
        )}

        <button
          onClick={handleAddToCart}
          aria-label={`Add ${name} to cart`}
          className="absolute bottom-3 right-3 w-9 h-9 rounded-full bg-white flex items-center justify-center opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-200 hover:bg-foreground hover:text-background"
        >
          <Plus size={16} strokeWidth={2} />
        </button>
      </div>

      <h3 className="text-[15px] font-medium mb-1">{name}</h3>
      <div className="flex items-center gap-2 text-sm">
        <span className={compareAtPrice ? "text-red-600" : "text-foreground"}>
          ${price}
        </span>
        {compareAtPrice && (
          <span className="text-muted-foreground line-through">
            ${compareAtPrice}
          </span>
        )}
      </div>
    </a>
  );
}