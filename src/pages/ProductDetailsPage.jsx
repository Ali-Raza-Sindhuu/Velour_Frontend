import { useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useDispatch } from "react-redux";
import { Star, Play, X } from "lucide-react";
import AnnouncementBar from "@/components/AnnouncementBar";
import Navbar from "@/components/Navbar";
import Footer from "@/components/layout/Footer";
import { addItem } from "@/store/slices/cartSlice";
import { toggleCart } from "@/store/slices/uiSlice";
import { featuredProducts, womenProducts } from "@/data/products";
import { MEN_PRODUCTS } from "@/data/menProducts";
import { KIDS_PRODUCTS } from "@/data/kidsProducts";

const DEFAULT_SIZES = ["XS", "S", "M", "L", "XL"];
const DEFAULT_COLORS = [
  { name: "Red", hex: "#E5493D" },
  { name: "Blue", hex: "#3B5FE0" },
  { name: "Milk", hex: "#F2F1ED" },
  { name: "Green", hex: "#2E9E4F" },
];
const TABS = ["Overview", "Details", "Care"];

// Falls back to a generic chart when the product doesn't supply its own —
// swap in real measurements per product where you have them.
const DEFAULT_SIZE_CHART = {
  headers: ["Size", "Chest (in)", "Length (in)", "Sleeve (in)"],
  rows: [
    ["XS", "36–38", "26", "23.5"],
    ["S", "39–41", "26.5", "24"],
    ["M", "42–44", "27", "24.5"],
    ["L", "45–47", "27.5", "25"],
    ["XL", "48–50", "28", "25.5"],
  ],
};

export default function ProductDetailsPage() {
  const { productId } = useParams();
  const dispatch = useDispatch();

  const product = useMemo(
    () =>
      [...featuredProducts, ...womenProducts, ...MEN_PRODUCTS, ...KIDS_PRODUCTS].find(
        (item) => item.id === productId
      ),
    [productId]
  );

  // Product data doesn't carry these fields yet — fall back to sane defaults
  // so the page still renders correctly until they're added upstream.
  const images = product?.images?.length ? product.images : product ? [product.image] : [];
  const colors = product?.colors?.length ? product.colors : DEFAULT_COLORS;
  const sizes = product?.sizes?.length ? product.sizes : DEFAULT_SIZES;
  const rating = product?.rating ?? 4;
  const reviewCount = product?.reviewCount ?? null;

  const sizeChart = product?.sizeChart ?? DEFAULT_SIZE_CHART;

  const [activeImage, setActiveImage] = useState(0);
  const [selectedColor, setSelectedColor] = useState(colors[0]?.name);
  const [selectedSize, setSelectedSize] = useState(sizes[Math.floor(sizes.length / 2)]);
  const [activeTab, setActiveTab] = useState("Overview");
  const [sizeGuideOpen, setSizeGuideOpen] = useState(false);

  if (!product) {
    return (
      <div className="min-h-screen bg-white">
        <AnnouncementBar />
        <Navbar />
        <main className="container py-24 text-center">
          <h1 className="mb-3 text-3xl font-semibold">Product not found</h1>
          <Link to="/" className="underline">
            Return to the shop
          </Link>
        </main>
        <Footer />
      </div>
    );
  }

  const addToCart = () => {
    dispatch(
      addItem({
        id: product.id,
        name: product.name,
        price: product.price,
        image: product.image,
        size: selectedSize,
        qty: 1,
      })
    );
    dispatch(toggleCart());
  };

  return (
    <div className="min-h-screen bg-white">
      <AnnouncementBar />
      <Navbar />

      <main className="container py-8">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-white/50 mb-6">
          <Link to="/women" className="hover:text-white">
            {product.category ?? "Women"}
          </Link>
          <span>{">"}</span>
          <Link to="/hoodies" className="hover:text-white">
            {product.subcategory ?? "Hoodies"}
          </Link>
          <span>{">"}</span>
          <span className="text-white">{product.name}</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-[100px_1fr_1fr] gap-6">
          {/* Thumbnails */}
          <div className="order-2 md:order-1 flex md:flex-col gap-3 overflow-x-auto md:overflow-visible">
            {images.map((src, i) => (
              <button
                key={src + i}
                onClick={() => setActiveImage(i)}
                className={`relative flex-shrink-0 w-20 h-24 md:w-full md:h-28 rounded-lg overflow-hidden border-2 ${
                  activeImage === i ? "border-foreground" : "border-transparent"
                }`}
              >
                <img src={src} alt={`${product.name} view ${i + 1}`} className="w-full h-full object-cover" />
                {i === 0 && images.length > 1 && (
                  <span className="absolute inset-0 flex items-center justify-center bg-black/20">
                    <Play className="w-4 h-4 text-white fill-white" />
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Main image */}
          <div className="order-1 md:order-2 rounded-xl overflow-hidden bg-muted/30">
            <img
              src={images[activeImage] ?? product.image}
              alt={product.name}
              className="w-full h-full object-cover aspect-[4/5]"
            />
          </div>

          {/* Details */}
          <div className="order-3 flex flex-col pt-1">
            <p className="text-xs font-medium text-muted-foreground mb-4">Free Shipping On Orders Over $150</p>

            <h1 className="text-2xl font-medium leading-snug mb-3">{product.name}</h1>

            <p className="text-2xl font-semibold mb-2">${product.price.toFixed(2)}</p>

            <div className="flex items-center gap-2 mb-6">
              <div className="flex items-center gap-0.5">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star
                    key={i}
                    className={`w-3.5 h-3.5 ${
                      i < Math.round(rating) ? "fill-foreground text-foreground" : "text-border"
                    }`}
                  />
                ))}
              </div>
              {reviewCount != null && (
                <span className="text-xs text-muted-foreground">| {reviewCount} reviews</span>
              )}
            </div>

            <p className="text-sm text-muted-foreground mb-2">
              Color: <span className="text-foreground font-medium">{selectedColor}</span>
            </p>
            <div className="flex items-center gap-3 mb-6">
              {colors.map((color) => (
                <button
                  key={color.name}
                  onClick={() => setSelectedColor(color.name)}
                  aria-label={color.name}
                  className={`w-7 h-7 rounded-full border-2 ${
                    selectedColor === color.name ? "border-foreground" : "border-transparent"
                  }`}
                  style={{ backgroundColor: color.hex }}
                />
              ))}
            </div>

            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-muted-foreground">
                Size: <span className="text-foreground font-medium">{selectedSize}</span>
              </p>
              <button
                onClick={() => setSizeGuideOpen(true)}
                className="text-xs text-muted-foreground underline hover:text-foreground"
              >
                Size Guide
              </button>
            </div>
            <div className="flex flex-wrap gap-2 mb-7">
              {sizes.map((size) => (
                <button
                  key={size}
                  onClick={() => setSelectedSize(size)}
                  className={`w-12 h-11 rounded-md text-sm font-medium border ${
                    selectedSize === size
                      ? "bg-foreground text-background border-foreground"
                      : "bg-white border-border text-foreground/80 hover:border-foreground/40"
                  }`}
                >
                  {size}
                </button>
              ))}
            </div>

            <button
              onClick={addToCart}
              className="w-full rounded-full bg-foreground py-3.5 text-sm font-bold tracking-wide text-background mb-3 hover:brightness-110"
            >
              BUY NOW
            </button>
            <button
              onClick={addToCart}
              className="w-full rounded-full border border-foreground py-3.5 text-sm font-bold tracking-wide text-foreground mb-8 hover:bg-muted/40"
            >
              ADD TO BAG
            </button>

            <div className="flex items-center gap-6 border-b border-border mb-4">
              {TABS.map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`pb-3 text-sm font-medium -mb-px border-b-2 ${
                    activeTab === tab
                      ? "text-foreground border-foreground"
                      : "text-muted-foreground border-transparent hover:text-foreground/80"
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>
            <p className="text-sm leading-relaxed text-muted-foreground max-w-md">
              {product.description ??
                "A versatile wardrobe piece, cut for everyday wear and built to layer easily through the season."}
            </p>
          </div>
        </div>
      </main>

      {/* Recommended products */}
      <section className="container py-16 border-t border-border">
        <h2 className="text-4xl font-bold text-center mb-10">Recommended Products</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {featuredProducts.slice(0, 4).map((item) => (
            <Link key={item.id} to={`/product/${item.id}`} className="group">
              <div className="aspect-[3/4] rounded-lg overflow-hidden bg-muted/30 mb-3">
                <img
                  src={item.image}
                  alt={item.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
              </div>
              <p className="text-sm font-medium">{item.name}</p>
              <p className="text-sm text-muted-foreground">${item.price.toFixed(2)}</p>
            </Link>
          ))}
        </div>
      </section>

      <Footer />

      {sizeGuideOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
          onClick={() => setSizeGuideOpen(false)}
        >
          <div
            className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between mb-1">
              <h2 className="text-lg font-semibold">Size Guide</h2>
              <button
                onClick={() => setSizeGuideOpen(false)}
                aria-label="Close size guide"
                className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-muted/50"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-sm text-muted-foreground mb-5">
              Measurements for {product.name}. Between sizes? Size up for a relaxed fit.
            </p>

            <div className="overflow-x-auto rounded-xl border border-border">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-muted/30">
                    {sizeChart.headers.map((header) => (
                      <th key={header} className="px-4 py-2.5 text-left font-medium">
                        {header}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {sizeChart.rows.map((row) => (
                    <tr
                      key={row[0]}
                      className={`border-t border-border ${
                        row[0] === selectedSize ? "bg-muted/20 font-medium" : ""
                      }`}
                    >
                      {row.map((cell, i) => (
                        <td key={i} className="px-4 py-2.5">
                          {cell}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex flex-wrap gap-2 mt-5">
              {sizes.map((size) => (
                <button
                  key={size}
                  onClick={() => {
                    setSelectedSize(size);
                    setSizeGuideOpen(false);
                  }}
                  className={`w-12 h-11 rounded-md text-sm font-medium border ${
                    selectedSize === size
                      ? "bg-foreground text-background border-foreground"
                      : "bg-white border-border text-foreground/80 hover:border-foreground/40"
                  }`}
                >
                  {size}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}