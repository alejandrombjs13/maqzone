import Link from "next/link";
import Image from "next/image";
import fs from "fs";
import path from "path";
import { fetchListing, fetchListings, waMsg } from "../../lib/api";
import ImageLightbox from "../../components/image-lightbox";
import LikeButton from "../../components/like-button";

function getProductImages(imageUrl: string): string[] {
  const baseDir = imageUrl.replace(/\/[^/]+$/, "");
  const fsDir = path.join(process.cwd(), "public", baseDir);

  try {
    const files = fs.readdirSync(fsDir)
      .filter((f) => /\.(png|jpg|jpeg|webp)$/i.test(f))
      .sort((a, b) => {
        const na = parseInt(a);
        const nb = parseInt(b);
        return na - nb;
      });
    return files.map((f) => `${baseDir}/${f}`);
  } catch {
    return [imageUrl];
  }
}

export default async function ProductoDetalle({
  params,
}: {
  params: { id: string };
}) {
  const listing = await fetchListing(params.id);

  if (!listing) {
    return (
      <div className="section py-20 text-center">
        <h1 className="text-3xl font-semibold text-sand">
          Producto no encontrado
        </h1>
        <p className="mt-4 text-sand/70">
          Este producto no existe o ya fue vendido.
        </p>
        <Link href="/catalogo" className="button-primary mt-8 inline-flex">
          Volver al catalogo
        </Link>
      </div>
    );
  }

  const allListings = await fetchListings(20);
  const related = allListings
    .filter((l) => l.id !== listing.id)
    .slice(0, 3);

  const images = getProductImages(listing.image_url || "/products/haas-sl30t/1.png");

  return (
    <>
      {/* Breadcrumb */}
      <nav className="section pt-6 sm:pt-8">
        <div className="flex items-center gap-2 text-xs text-sand/50 sm:text-sm">
          <Link href="/" className="transition hover:text-sand">
            Inicio
          </Link>
          <span>/</span>
          <Link href="/catalogo" className="transition hover:text-sand">
            Catalogo
          </Link>
          <span>/</span>
          <span className="text-sand/80 truncate max-w-[200px] inline-block align-bottom">
            {listing.title}
          </span>
        </div>
      </nav>

      {/* Main content */}
      <section className="section pt-6 pb-10 sm:pb-16">
        <div className="grid gap-8 lg:grid-cols-[1.2fr_0.8fr]">
          {/* Left: Image gallery with lightbox */}
          <div className="space-y-4">
            <div className="relative">
              <div className="absolute left-4 top-4 z-10 flex gap-2">
                <span className="tag backdrop-blur">
                  {listing.sale_type === "auction"
                    ? "Subasta premium"
                    : "Activo certificado"}
                </span>
                <span className="rounded-full bg-graphite/60 px-3 py-1 text-xs text-sand/80 backdrop-blur">
                  ID #{listing.id}
                </span>
              </div>
              <ImageLightbox images={images} alt={listing.title} />
            </div>
          </div>

          {/* Right: Details */}
          <div className="space-y-5">
            <div>
              <h1 className="text-2xl font-semibold text-sand sm:text-3xl lg:text-4xl">
                {listing.title}
              </h1>
              <div className="mt-2 flex items-center gap-3 text-sm text-sand/60">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                {listing.location}
              </div>
            </div>

            <p className="text-sm leading-relaxed text-sand/70 sm:text-base">
              {listing.description}
            </p>

            {/* Price panel */}
            <div className="glass rounded-[20px] p-5 sm:p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-[10px] uppercase tracking-[0.2em] text-sand/50 sm:text-xs">
                    Precio
                  </p>
                  <p className="text-2xl font-semibold text-ember sm:text-3xl">
                    {listing.price > 0
                      ? `$${listing.price.toLocaleString("es-MX")}`
                      : "Consultar"}
                  </p>
                  {listing.price > 0 && (
                    <p className="text-xs text-sand/40">MXN</p>
                  )}
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-[0.2em] text-sand/50 sm:text-xs">
                    Ano del equipo
                  </p>
                  <p className="text-2xl font-semibold text-sand sm:text-3xl">
                    {listing.year}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-2xl border border-sand/10 bg-graphite/60 p-3">
                  <p className="text-[10px] uppercase tracking-[0.2em] text-sand/50">Estado</p>
                  <p className="mt-1 text-sm font-semibold text-sand">
                    {listing.status === "active" ? "Disponible" : listing.status}
                  </p>
                </div>
                <div className="rounded-2xl border border-sand/10 bg-graphite/60 p-3">
                  <p className="text-[10px] uppercase tracking-[0.2em] text-sand/50">Tipo de venta</p>
                  <p className="mt-1 text-sm font-semibold text-sand">
                    {listing.sale_type === "direct" ? "Venta directa" : "Subasta"}
                  </p>
                </div>
              </div>

              <a
                href={waMsg(`Hola, quiero comprar: ${listing.title} (ID #${listing.id}) - $${listing.price.toLocaleString("es-MX")} MXN`)}
                target="_blank"
                rel="noopener noreferrer"
                className="button-primary w-full text-base"
              >
                Comprar ahora
              </a>
            </div>

            {/* Quick actions */}
            <div className="grid grid-cols-2 gap-3">
              <a
                href={waMsg(`Quiero agendar inspeccion para: ${listing.title} (ID #${listing.id})`)}
                target="_blank"
                rel="noopener noreferrer"
                className="button-ghost text-xs sm:text-sm"
              >
                Agendar inspeccion
              </a>
              <LikeButton listingId={listing.id} />
            </div>
          </div>
        </div>
      </section>

      {/* Specs + Inspection + Logistics */}
      <section className="section pb-10 sm:pb-16">
        <div className="grid gap-6 sm:gap-8 lg:grid-cols-3">
          <div className="card space-y-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-ember/10">
                <svg className="h-5 w-5 text-ember" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-sand">Especificaciones</h3>
            </div>
            <div className="space-y-3">
              {[
                ["Equipo", listing.title],
                ["Ano", String(listing.year)],
                ["Ubicacion", listing.location],
                ["Disponibilidad", listing.status === "active" ? "Inmediata" : listing.status],
                ["Certificacion", "Certificacion MAQZONE"],
                ["Documentacion", "Completa"],
              ].map(([label, value]) => (
                <div key={label} className="flex justify-between border-b border-sand/10 pb-2">
                  <span className="text-xs text-sand/50 sm:text-sm">{label}</span>
                  <span className="text-xs font-semibold text-sand sm:text-sm">{value}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="card space-y-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan/10">
                <svg className="h-5 w-5 text-cyan" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-sand">Inspeccion</h3>
            </div>
            <p className="text-sm text-sand/60">
              Todos los equipos de la Tienda en Linea pasan por inspeccion
              tecnica rigurosa y se entregan funcionando para operacion inmediata.
            </p>
            <div className="space-y-2">
              {[
                "Inspeccion mecanica completa",
                "Certificado de horas",
                "Historial de mantenimiento",
                "Reporte fotografico",
                "Prueba de funcionamiento",
              ].map((label) => (
                <div key={label} className="flex items-center gap-2">
                  <svg className="h-4 w-4 text-cyan" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-xs text-sand/70 sm:text-sm">{label}</span>
                </div>
              ))}
            </div>
            <a
              href={waMsg(`Solicito reporte de inspeccion: ${listing.title} (ID #${listing.id})`)}
              target="_blank"
              rel="noopener noreferrer"
              className="button-ghost w-full text-xs sm:text-sm"
            >
              Solicitar reporte
            </a>
          </div>

          <div className="card space-y-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sand/10">
                <svg className="h-5 w-5 text-sand/70" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-sand">Logistica y pago</h3>
            </div>
            <div className="space-y-3">
              {[
                ["Metodo de pago", "Transferencia bancaria"],
                ["Plazo de pago", "Acordado con vendedor"],
                ["Envio", "Asesoria logistica MAQZONE"],
                ["Importacion", "Gestion aduanal incluida"],
                ["Documentos", "Validacion legal completa"],
                ["Soporte", "Capacitacion operativa"],
              ].map(([label, value]) => (
                <div key={label} className="flex justify-between border-b border-sand/10 pb-2">
                  <span className="text-xs text-sand/50 sm:text-sm">{label}</span>
                  <span className="text-xs font-semibold text-sand sm:text-sm">{value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Garantia */}
      <section className="section pb-10 sm:pb-16">
        <div className="glass rounded-[24px] p-6 sm:rounded-[32px] sm:p-8">
          <h3 className="text-xl font-semibold text-sand sm:text-2xl">
            Certificacion MAQZONE
          </h3>
          <p className="mt-3 text-sm text-sand/70 sm:text-base">
            Los equipos de nuestra Tienda en Linea son importados de USA,
            seleccionados y puestos a punto mecanicamente. Cada activo pasa
            por inspeccion tecnica rigurosa antes de la venta.
          </p>
          <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              { title: "Puesta a punto", desc: "Equipo revisado y funcionando" },
              { title: "Inspeccion real", desc: "Reporte tecnico incluido" },
              { title: "Logistica segura", desc: "Importacion y flete coordinados" },
              { title: "Certeza legal", desc: "Documentacion validada" },
            ].map((g) => (
              <div key={g.title} className="text-center">
                <p className="mt-2 text-sm font-semibold text-sand">{g.title}</p>
                <p className="text-xs text-sand/50">{g.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Related */}
      {related.length > 0 && (
        <section className="section pb-16 sm:pb-20">
          <h2 className="text-xl font-semibold text-sand sm:text-2xl">
            Otros productos disponibles
          </h2>
          <div className="mt-6 grid gap-4 sm:grid-cols-2 sm:gap-6 lg:grid-cols-3">
            {related.map((r) => (
              <Link
                key={r.id}
                href={`/productos/${r.id}`}
                className="card transition hover:-translate-y-1"
              >
                <div className="mb-3 overflow-hidden rounded-2xl border border-sand/10">
                  <Image
                    src={r.image_url || "/products/haas-sl30t/1.png"}
                    alt={r.title}
                    width={600}
                    height={360}
                    className="h-36 w-full object-cover"
                  />
                </div>
                <h3 className="text-lg font-semibold text-sand">{r.title}</h3>
                <p className="text-xs text-sand/60">{r.location}</p>
                <p className="mt-2 text-base font-semibold text-ember">
                  ${r.price.toLocaleString("es-MX")} MXN
                </p>
              </Link>
            ))}
          </div>
        </section>
      )}
    </>
  );
}
