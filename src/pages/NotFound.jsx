import { Link } from "react-router-dom";

const NotFound = () => {
  return (
    <section className="flex min-h-screen flex-col items-center justify-center gap-6 bg-white px-6 text-center">
      <p className="font-display text-[clamp(4rem,12vw,8rem)] font-semibold leading-none tracking-tight text-black/10">
        404
      </p>
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold text-black">We couldn't find that page</h1>
        <p className="max-w-sm text-sm text-black/50">
          The link may be out of date, or the page may have moved. Let's get you back to the collection.
        </p>
      </div>
      <Link
        to="/shops"
        className="inline-flex items-center justify-center rounded-full bg-black px-8 py-3.5 text-sm font-medium text-white transition hover:bg-black/90"
      >
        Return to Shop
      </Link>
    </section>
  );
};

export default NotFound;
