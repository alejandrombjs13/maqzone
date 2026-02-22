import Image from "next/image";
import Link from "next/link";
import type { Listing } from "../lib/api";

type Variant = "grid" | "featured" | "compact";

export default function ProductCard({
  listing,
  variant = "grid",
}: {
  listing: Listing;
  variant?: Variant;
}) {
  const isFeatured = variant === "featured";
  const isCompact = variant === "compact";

  return (
    <Link
      href={`/productos/${listing.id}`}
      className="card group transition hover:-translate-y-1"
    >
      <div
        className={`mb-3 overflow-hidden rounded-2xl border border-sand/10 sm:mb-4 ${
          isCompact ? "" : ""
        }`}
      >
        <Image
          src={listing.image_url || "/products/haas-sl30t/1.png"}
          alt={listing.title}
          width={600}
          height={360}
          className={`w-full object-cover transition-transform duration-300 group-hover:scale-105 ${
            isFeatured ? "h-36 sm:h-52" : isCompact ? "h-28 sm:h-36" : "h-28 sm:h-40"
          }`}
        />
      </div>
      <p className="text-[9px] uppercase tracking-[0.2em] text-sand/50 sm:text-xs sm:tracking-[0.3em]">
        {listing.sale_type === "auction" ? "Subasta premium" : "Venta directa"}
      </p>
      <h3
        className={`mt-2 font-semibold text-sand ${
          isFeatured ? "text-base sm:text-xl" : "text-sm sm:text-lg"
        }`}
      >
        {listing.title}
      </h3>
      {!isCompact && (
        <p className="hidden text-sm text-sand/60 sm:block">
          {listing.location}
        </p>
      )}
      <div className="mt-3 flex items-center justify-between sm:mt-4">
        <p className="text-[10px] text-sand/60 sm:text-sm">
          Ano {listing.year}
        </p>
        <p
          className={`font-semibold text-ember ${
            isFeatured ? "text-sm sm:text-lg" : "text-xs sm:text-base"
          }`}
        >
          {listing.price > 0
            ? `$${listing.price.toLocaleString("es-MX")}`
            : "Consultar"}
        </p>
      </div>
    </Link>
  );
}
