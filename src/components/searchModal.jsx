import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Search, X } from "lucide-react";
import { Link } from "react-router-dom";
import { fetchProductsRequest } from "../api/productsApi";
import { resolveImg } from "../utils/resolveImg";
import FramedImage from "./ui/FramedImage";
import { formatPrice } from "../utils/price";

const TRENDING = ["Oud", "Vanilla", "Rose", "Citrus"];

const SearchModal = ({ isOpen, onClose }) => {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => {
  if (isOpen) {
    inputRef.current?.focus();
  } else {
    setTimeout(() => {
      setQuery("");
      setResults([]);
    }, 0);
  }
}, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  // Debounced live search against the real products endpoint.
  useEffect(() => {
    const trimmed = query.trim();
    if (!trimmed) {
      setResults([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const timer = setTimeout(() => {
      fetchProductsRequest({ search: trimmed, limit: 6 })
        .then((res) => setResults(res?.data || []))
        .catch(() => setResults([]))
        .finally(() => setLoading(false));
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-50 flex items-start justify-center bg-black/20 p-4 pt-24 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            onClick={(e) => e.stopPropagation()}
            initial={{ opacity: 0, scale: 0.97, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: -10 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="w-full max-w-xl rounded-3xl bg-white p-6 shadow-2xl"
          >
            <div className="flex items-center gap-3 border-b border-gray-100 pb-4">
              <Search size={18} className="text-gray-400" />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search for products, collections..."
                className="flex-1 text-sm text-gray-900 outline-none placeholder:text-gray-400"
              />
              {query && (
                <button
                  onClick={() => setQuery("")}
                  aria-label="Clear search"
                  className="text-gray-400 hover:text-gray-700"
                >
                  <X size={16} />
                </button>
              )}
              <button
                onClick={onClose}
                aria-label="Close search"
                className="rounded-full p-1.5 text-gray-500 hover:bg-gray-100 hover:text-gray-900"
              >
                <X size={18} />
              </button>
            </div>

            <div className="pt-4">
              {query ? (
                loading ? (
                  <p className="py-8 text-center text-sm text-gray-500">Searching…</p>
                ) : results.length > 0 ? (
                  <ul className="max-h-80 divide-y divide-gray-100 overflow-y-auto">
                    {results.map((product) => (
                      <li key={product.id}>
                        <Link
                          to={`/shop/${product.slug}`}
                          onClick={onClose}
                          className="flex items-center gap-3 py-3 hover:bg-gray-50"
                        >
                          <FramedImage
                            src={resolveImg(product.image_url)}
                            alt={product.name}
                            depth={false}
                            className="h-12 w-12 shrink-0 rounded-lg bg-gray-100"
                          />
                          <div className="flex-1 min-w-0">
                            <p className="truncate text-sm font-medium text-gray-900">{product.name}</p>
                            <p className="text-xs text-gray-500">{formatPrice(product.price)}</p>
                          </div>
                        </Link>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="py-8 text-center text-sm text-gray-500">
                    No products found for "{query}"
                  </p>
                )
              ) : (
                <>
                  <p className="mb-3 text-xs font-medium uppercase tracking-wide text-gray-400">
                    Trending
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {TRENDING.map((term) => (
                      <button
                        key={term}
                        onClick={() => setQuery(term)}
                        className="rounded-full border border-gray-200 px-3 py-1.5 text-xs text-gray-700 transition hover:bg-gray-50"
                      >
                        {term}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default SearchModal;