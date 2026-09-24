# UI Redesign — shadcn migration (in progress)

## What's in this zip
- `src/lib/utils.js` — shadcn `cn()` helper
- `src/components/ui/button.jsx`, `card.jsx`, `badge.jsx`, `input.jsx` — shadcn primitives (Tailwind v4 + CVA + Radix)
- Updated: `SectionHeader.jsx`, `SampleProduct.jsx`, `components/sections/HeroSection.jsx`
- `src/index.css` — added brand color tokens (violet/fuchsia)

No files in `api/`, `store/`, `features/`, or `hooks/` were touched — all data fetching, Redux logic, and business logic is untouched.

## Required before this builds
This zip only contains `src/`. You still need to, in your project root:

```bash
npm install class-variance-authority clsx tailwind-merge lucide-react @radix-ui/react-slot @radix-ui/react-dialog @radix-ui/react-dropdown-menu @radix-ui/react-label @radix-ui/react-separator @radix-ui/react-avatar tailwindcss-animate
```

Then drop this `src/` folder into your project (overwriting the matching files), keeping your existing `package.json`, `vite.config.js`, `index.html`.

## Next pages to redesign (ask me one at a time)
- CollectionCard.jsx (Home)
- ProductDetails.jsx
- CartPage.jsx / Checkout.jsx
- Wishlist.jsx / Orders.jsx / OrderDetail.jsx
- Auth pages, static pages (About/FAQ/Contact/etc.)
- Admin panel (last priority)
