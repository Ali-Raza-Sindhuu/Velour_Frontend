import { Link } from "react-router-dom";
import { Plus } from "lucide-react";
import { useDispatch } from "react-redux";
import { addItem } from "@/store/slices/cartSlice";

export default function ProductCard({ product }) {
  const dispatch = useDispatch();
  const { id, name, price, compareAtPrice, image, tag } = product;
  const addToCart = (event) => { event.preventDefault(); dispatch(addItem({ id, name, price, image, size: "M", qty: 1 })); };
  return <Link to={`/product/${id}`} className="group block"><div className="relative mb-4 aspect-[3/4] overflow-hidden bg-muted"><img src={image} alt={name} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />{tag && <span className="absolute left-3 top-3 bg-white px-3 py-1 text-xs font-medium tracking-wide">{tag}</span>}<button onClick={addToCart} aria-label={`Add ${name} to cart`} className="absolute bottom-3 right-3 flex h-9 w-9 translate-y-2 items-center justify-center rounded-full bg-white opacity-0 transition-all duration-200 hover:bg-foreground hover:text-background group-hover:translate-y-0 group-hover:opacity-100"><Plus size={16} strokeWidth={2} /></button></div><h3 className="mb-1 text-[15px] font-medium">{name}</h3><div className="flex items-center gap-2 text-sm"><span className={compareAtPrice ? "text-red-600" : "text-foreground"}>${price}</span>{compareAtPrice && <span className="text-muted-foreground line-through">${compareAtPrice}</span>}</div></Link>;
}
