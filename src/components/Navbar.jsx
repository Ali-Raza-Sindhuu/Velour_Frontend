import { useState } from "react";
import { Link } from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";
import { Search, User, ShoppingBag, Menu, X } from "lucide-react";
import { selectCartCount } from "@/store/slices/cartSlice";
import { toggleSearch, toggleCart, openAuthModal } from "@/store/slices/uiSlice";
import { selectUser, selectIsAuthenticated, logout } from "@/store/slices/authSlice";

const NAV_LINKS = [
  { label: "Women", href: "/women" },
  { label: "Men", href: "/men" },
  { label: "Kids", href: "/kids" },
  { label: "New Arrivals", href: "/new-arrivals" },
];

export default function Navbar() {
  const dispatch = useDispatch();
  const cartCount = useSelector(selectCartCount);
  const user = useSelector(selectUser);
  const isAuthenticated = useSelector(selectIsAuthenticated);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const initial = user?.name?.charAt(0).toUpperCase();

  return (
    <header className="w-full bg-white sticky top-0 z-40 border-b border-border/60">
      <div className="container flex items-center justify-between h-20">
        {/* Left: nav links (desktop) */}
        <nav className="hidden md:flex items-center gap-8">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.label}
              to={link.href}
              className="text-[15px] text-foreground/90 hover:text-foreground transition-colors"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        {/* Mobile menu toggle */}
        <button
          className="md:hidden"
          aria-label="Toggle menu"
          onClick={() => setMobileOpen((v) => !v)}
        >
          {mobileOpen ? <X size={22} /> : <Menu size={22} />}
        </button>

        {/* Center: logo */}
        <Link
          to="/"
          className="font-display text-3xl tracking-[0.15em] font-semibold select-none"
        >
          VÉRA
        </Link>

        {/* Right: icons */}
        <div className="flex items-center gap-5">
          <button
            aria-label="Search"
            onClick={() => dispatch(toggleSearch())}
            className="hover:opacity-60 transition-opacity"
          >
            <Search size={20} strokeWidth={1.5} />
          </button>

          <div className="relative hidden sm:inline-flex">
            {isAuthenticated ? (
              <>
                <button
                  aria-label="Account menu"
                  onClick={() => setAccountMenuOpen((v) => !v)}
                  className="flex h-8 w-8 items-center justify-center rounded-full bg-foreground text-background text-sm font-semibold hover:opacity-80 transition-opacity"
                >
                  {initial}
                </button>
                {accountMenuOpen && (
                  <div className="absolute right-0 top-10 z-50 w-40 rounded-xl border border-border bg-white py-2 shadow-lg">
                    <div className="truncate px-4 py-2 text-sm text-muted-foreground">
                      {user.name}
                    </div>
                    <button
                      onClick={() => {
                        dispatch(logout());
                        setAccountMenuOpen(false);
                      }}
                      className="w-full px-4 py-2 text-left text-sm hover:bg-muted"
                    >
                      Log out
                    </button>
                  </div>
                )}
              </>
            ) : (
              <button
                aria-label="Account"
                onClick={() => dispatch(openAuthModal("login"))}
                className="hover:opacity-60 transition-opacity"
              >
                <User size={20} strokeWidth={1.5} />
              </button>
            )}
          </div>

          <button
            aria-label="Cart"
            onClick={() => dispatch(toggleCart())}
            className="relative hover:opacity-60 transition-opacity"
          >
            <ShoppingBag size={20} strokeWidth={1.5} />
            {cartCount > 0 && (
              <span className="absolute -top-2 -right-2 bg-foreground text-background text-[10px] w-4 h-4 rounded-full flex items-center justify-center">
                {cartCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Mobile nav panel */}
      {mobileOpen && (
        <nav className="md:hidden flex flex-col border-t border-border/60 px-6 py-4 gap-4">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.label}
              to={link.href}
              className="text-[15px]"
              onClick={() => setMobileOpen(false)}
            >
              {link.label}
            </Link>
          ))}
        </nav>
      )}
    </header>
  );
}