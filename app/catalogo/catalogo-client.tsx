"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import ProductCard from "../components/product-card";
import { categories, matchCategory } from "../lib/categories";
import type { Listing } from "../lib/api";

type SortOption = "recent" | "price-asc" | "price-desc" | "year-desc";
type SaleFilter = "todos" | "direct" | "auction";

function normalizeSort(value: string | null): SortOption {
  if (value === "price-asc" || value === "price-desc" || value === "year-desc") {
    return value;
  }
  return "recent";
}

function normalizeSaleFilter(value: string | null): SaleFilter {
  if (value === "direct" || value === "auction") {
    return value;
  }
  return "todos";
}

export default function CatalogoClient({
  listings,
  initialSearch: initSearch = "",
  initialCategory: initCategory = "",
  initialSort: initSort = "",
  initialSale: initSale = "",
}: {
  listings: Listing[];
  initialSearch?: string;
  initialCategory?: string;
  initialSort?: string;
  initialSale?: string;
}) {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [search, setSearch] = useState(initSearch);
  const [activeCategory, setActiveCategory] = useState(initCategory);
  const [sort, setSort] = useState<SortOption>(normalizeSort(initSort));
  const [saleFilter, setSaleFilter] = useState<SaleFilter>(normalizeSaleFilter(initSale));

  const updateParams = useCallback((next: {
    q?: string;
    categoria?: string;
    sort?: SortOption;
    venta?: SaleFilter;
  }) => {
    const params = new URLSearchParams(searchParams.toString());

    if (next.q !== undefined) {
      if (next.q) params.set("q", next.q);
      else params.delete("q");
    }
    if (next.categoria !== undefined) {
      if (next.categoria) params.set("categoria", next.categoria);
      else params.delete("categoria");
    }
    if (next.sort !== undefined) {
      if (next.sort !== "recent") params.set("sort", next.sort);
      else params.delete("sort");
    }
    if (next.venta !== undefined) {
      if (next.venta !== "todos") params.set("venta", next.venta);
      else params.delete("venta");
    }

    const query = params.toString();
    router.replace(query ? `/catalogo?${query}` : "/catalogo", { scroll: false });
  }, [router, searchParams]);

  useEffect(() => {
    const id = setTimeout(() => {
      const current = searchParams.get("q") || "";
      if (current !== search) {
        updateParams({ q: search });
      }
    }, 300);
    return () => clearTimeout(id);
  }, [search, searchParams, updateParams]);

  function updateCategory(slug: string) {
    setActiveCategory(slug);
    updateParams({ categoria: slug });
  }

  const filtered = useMemo(() => {
    let result = listings;

    // Text search
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (l) =>
          l.title.toLowerCase().includes(q) ||
          l.description.toLowerCase().includes(q)
      );
    }

    // Category filter
    if (activeCategory) {
      result = result.filter(
        (l) => matchCategory(l.title, l.description) === activeCategory
      );
    }

    // Sale type filter
    if (saleFilter !== "todos") {
      result = result.filter((l) => l.sale_type === saleFilter);
    }

    // Sort
    switch (sort) {
      case "price-asc":
        result = [...result].sort((a, b) => a.price - b.price);
        break;
      case "price-desc":
        result = [...result].sort((a, b) => b.price - a.price);
        break;
      case "year-desc":
        result = [...result].sort((a, b) => b.year - a.year);
        break;
    }

    return result;
  }, [listings, search, activeCategory, sort, saleFilter]);

  return (
    <div className="section py-8 sm:py-12">
      {/* Header */}
      <div className="mb-8">
        <span className="tag">Catalogo</span>
        <h1 className="mt-4 text-2xl font-semibold text-sand sm:text-4xl">
          Todos los activos
        </h1>
        <p className="mt-3 text-sm text-sand/70 sm:text-base">
          {listings.length} activos disponibles. Busca, filtra y encuentra
          el equipo ideal para tu operacion.
        </p>
      </div>

      {/* Filters bar */}
      <div className="mb-8 space-y-4">
        {/* Search */}
        <div className="relative">
          <svg
            className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-sand/40"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
          <input
            type="text"
            placeholder="Buscar por nombre o descripcion..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-2xl border border-sand/15 bg-steel px-12 py-3 text-sm text-sand placeholder-sand/40 outline-none transition focus:border-cyan/50 focus:ring-1 focus:ring-cyan/30"
          />
          {search && (
            <button
              onClick={() => {
                setSearch("");
                updateParams({ q: "" });
              }}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-sand/40 transition hover:text-sand"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>

        {/* Category filter buttons + Sort + Sale type */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Categories */}
          <button
            onClick={() => updateCategory("")}
            className={`rounded-full px-4 py-2 text-xs font-semibold transition ${
              activeCategory === ""
                ? "bg-cyan text-white"
                : "border border-sand/20 text-sand/60 hover:border-sand/40 hover:text-sand"
            }`}
          >
            Todos
          </button>
          {categories.map((cat) => (
            <button
              key={cat.slug}
              onClick={() => updateCategory(cat.slug === activeCategory ? "" : cat.slug)}
              className={`rounded-full px-4 py-2 text-xs font-semibold transition ${
                activeCategory === cat.slug
                  ? "bg-cyan text-white"
                  : "border border-sand/20 text-sand/60 hover:border-sand/40 hover:text-sand"
              }`}
            >
              {cat.name}
            </button>
          ))}

          {/* Spacer */}
          <div className="hidden flex-1 sm:block" />

          {/* Sale type toggle */}
          <select
            value={saleFilter}
            onChange={(e) => {
              const value = e.target.value as SaleFilter;
              setSaleFilter(value);
              updateParams({ venta: value });
            }}
            className="rounded-xl border border-sand/15 bg-steel px-3 py-2 text-xs text-sand outline-none transition focus:border-cyan/50"
          >
            <option value="todos">Todos los tipos</option>
            <option value="direct">Venta directa</option>
            <option value="auction">Subasta</option>
          </select>

          {/* Sort dropdown */}
          <select
            value={sort}
            onChange={(e) => {
              const value = e.target.value as SortOption;
              setSort(value);
              updateParams({ sort: value });
            }}
            className="rounded-xl border border-sand/15 bg-steel px-3 py-2 text-xs text-sand outline-none transition focus:border-cyan/50"
          >
            <option value="recent">Mas recientes</option>
            <option value="price-asc">Precio: menor a mayor</option>
            <option value="price-desc">Precio: mayor a menor</option>
            <option value="year-desc">Año: más reciente</option>
          </select>
        </div>
      </div>

      {/* Results */}
      {filtered.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 sm:gap-6 lg:grid-cols-3 xl:grid-cols-4">
          {filtered.map((listing) => (
            <ProductCard key={listing.id} listing={listing} />
          ))}
        </div>
      ) : (
        <div className="glass rounded-[24px] p-8 sm:rounded-[32px] sm:p-12 text-center">
          <p className="text-xl font-semibold text-sand sm:text-2xl">
            Sin resultados
          </p>
          <p className="mt-3 text-sm text-sand/70 sm:text-base">
            {[
              search && `busqueda "${search}"`,
              activeCategory && `categoria "${categories.find((c) => c.slug === activeCategory)?.name ?? activeCategory}"`,
              saleFilter !== "todos" && `tipo "${saleFilter === "direct" ? "Venta directa" : "Subasta"}"`,
            ]
              .filter(Boolean)
              .join(", ")
              ? `No hay resultados para ${[
                  search && `busqueda "${search}"`,
                  activeCategory && `categoria "${categories.find((c) => c.slug === activeCategory)?.name ?? activeCategory}"`,
                  saleFilter !== "todos" && `tipo "${saleFilter === "direct" ? "Venta directa" : "Subasta"}"`,
                ]
                  .filter(Boolean)
                  .join(" + ")}.`
              : "No encontramos activos con esos filtros. Intenta con otra busqueda o categoria."}
          </p>
          <button
            onClick={() => {
              setSearch("");
              setActiveCategory("");
              setSaleFilter("todos");
              setSort("recent");
              updateParams({ q: "", categoria: "", venta: "todos", sort: "recent" });
            }}
            className="button-ghost mt-6"
          >
            Limpiar filtros
          </button>
        </div>
      )}
    </div>
  );
}
