import { useState } from "react";
import money from "../assets/money.svg";
import { Link } from "react-router-dom";
import FramedImage from "./ui/FramedImage";
import { Badge } from "./ui/Badge";
import { Button } from "./ui/button";
import { Card } from "./ui/card";

const CollectionCard = ({
  images,
  wearType,
  wearBadge,
  title1,
  title2,
  priceFrom,
  priceTo,
  description,
  link,
  reverse = false,
}) => {
  const [current, setCurrent] = useState(0);

  return (
    <Card
      className={`flex w-full flex-col overflow-hidden rounded-3xl p-0 lg:min-h-[22rem] lg:flex-row ${
        reverse ? "lg:flex-row-reverse" : "lg:flex-row"
      }`}
    >
      <div className="relative min-h-[220px] w-full overflow-hidden bg-neutral-200 sm:min-h-[280px] lg:min-h-[22rem] lg:w-1/2">
  {images.map((img, i) => (
    <div
      key={i}
      className="absolute inset-0 transition-opacity duration-500"
      style={{
        opacity: i === current ? 1 : 0,
        pointerEvents: i === current ? "auto" : "none",
      }}
    >
      {/* Shown whole, never cropped; any gap continues the image's own edges. */}
      <FramedImage
        src={img}
        alt={`Collection ${i + 1}`}
        draggable={false}
        className="absolute inset-0"
      />
    </div>
  ))}


  <div className="absolute bottom-4 left-1/2 z-10 flex -translate-x-1/2 items-center gap-2 rounded-full bg-black/30 px-3 py-2 backdrop-blur-md">
    {images.map((_, i) => (
      <button
        key={i}
        onClick={() => setCurrent(i)}
        aria-label={`Show collection image ${i + 1}`}
        className="transition-all duration-300"
        style={{
          width: i === current ? "28px" : "8px",
          height: "8px",
          borderRadius: "999px",
          background:
            i === current
              ? "#ffffff"
              : "rgba(255,255,255,0.4)",
        }}
      />
    ))}
  </div>
</div>

      <div className="flex w-full flex-col justify-center gap-6 bg-[#eeeeee] px-5 py-8 sm:px-6 sm:py-10 md:px-8 lg:w-1/2 lg:p-10">
        <div className="flex flex-col gap-4">
          <Badge className="w-fit gap-0 overflow-hidden border border-black/10 bg-white p-0 pr-3 text-black shadow-sm">
            <span className="rounded-full bg-gradient-to-br from-violet-600 to-fuchsia-600 px-3 py-1.5 text-xs text-white">
              {wearBadge}
            </span>
            <span className="pl-2">{wearType}</span>
          </Badge>

          <h2 className="font-display text-[clamp(2rem,4vw,3.5rem)] font-semibold leading-[1.05] tracking-tight text-black">
            {title1} <br /> {title2}
          </h2>

          <p className="max-w-xl text-sm leading-7 text-black/60 sm:text-base">
            {description ||
              "Long-lasting fragrances blended from carefully chosen oils, made to stay with you from morning to night."}
          </p>
        </div>

        <div className="flex flex-col gap-4 rounded-2xl bg-white p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-[#eeeeee] p-2">
              <img
                src={money}
                alt="pricing"
                className="h-8 w-8 object-contain"
              />
            </div>
            <div>
              <p className="text-xs font-medium text-black/40">
                Pricing starts from
              </p>
              <p className="text-base font-bold text-black">
                {priceFrom} — {priceTo}
              </p>
            </div>
          </div>

          <Button asChild size="lg" className="w-full sm:w-auto">
            <Link to={link || "/shops"}>Shop now</Link>
          </Button>
        </div>
      </div>
    </Card>
  );
};

export default CollectionCard;