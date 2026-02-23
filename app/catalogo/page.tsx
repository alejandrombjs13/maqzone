import { fetchListings } from "../lib/api";
import CatalogoClient from "./catalogo-client";

export const metadata = {
  title: "Catalogo | MAQZONE",
  description: "Explora nuestro catalogo completo de maquinaria pesada, vehiculos y equipos industriales certificados.",
};

export default async function CatalogoPage({
  searchParams,
}: {
  searchParams: { q?: string; categoria?: string; sort?: string; venta?: string };
}) {
  const listings = await fetchListings(50);

  return (
    <CatalogoClient
      listings={listings}
      initialSearch={searchParams.q || ""}
      initialCategory={searchParams.categoria || ""}
      initialSort={searchParams.sort || ""}
      initialSale={searchParams.venta || ""}
    />
  );
}
