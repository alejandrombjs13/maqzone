import { Suspense } from "react";
import { fetchListings } from "../lib/api";
import CatalogoClient from "./catalogo-client";

export const metadata = {
  title: "Catalogo | MAQZONE",
  description: "Explora nuestro catalogo completo de maquinaria pesada, vehiculos y equipos industriales certificados.",
};

export default async function CatalogoPage() {
  const listings = await fetchListings(50);

  return (
    <Suspense>
      <CatalogoClient listings={listings} />
    </Suspense>
  );
}
