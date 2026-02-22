import Image from "next/image";
import Link from "next/link";
import fs from "fs";
import path from "path";
import { type Metadata } from "next";
import LiveBidPanel from "../../components/live-bid-panel";
import ImageLightbox from "../../components/image-lightbox";
import { API_BASE, WA_LINK, waMsg, type Auction } from "../../lib/api";

async function loadAuction(id: string): Promise<Auction | null> {
  try {
    const res = await fetch(`${API_BASE}/api/auctions/${id}`, {
      next: { revalidate: 15 },
    });
    if (!res.ok) return null;
    return (await res.json()) as Auction;
  } catch {
    return null;
  }
}

async function loadRelated(excludeId: string): Promise<Auction[]> {
  try {
    const res = await fetch(`${API_BASE}/api/auctions?limit=6`, {
      next: { revalidate: 30 },
    });
    if (!res.ok) return [];
    const data = (await res.json()) as Auction[];
    return data.filter((a) => String(a.id) !== excludeId).slice(0, 3);
  } catch {
    return [];
  }
}

function getAuctionImages(imageUrl: string | undefined | null): string[] {
  const fallback = "/products/haas-sl30t/1.png";
  const url = imageUrl || fallback;
  // Only try to discover siblings for local /products/ paths
  if (!url.startsWith("/products/")) return [url];
  const baseDir = url.replace(/\/[^/]+$/, "");
  const fsDir = path.join(process.cwd(), "public", baseDir);
  try {
    const files = fs
      .readdirSync(fsDir)
      .filter((f) => /\.(png|jpg|jpeg|webp)$/i.test(f))
      .sort((a, b) => parseInt(a) - parseInt(b));
    return files.map((f) => `${baseDir}/${f}`);
  } catch {
    return [url];
  }
}

function formatEndTime(endTime: string): string {
  try {
    return new Date(endTime).toLocaleDateString("es-MX", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return endTime;
  }
}

export async function generateMetadata({
  params,
}: {
  params: { id: string };
}): Promise<Metadata> {
  const auction = await loadAuction(params.id);
  if (!auction) return { title: "Subasta no encontrada — MAQZONE" };
  return {
    title: `${auction.title} — Subasta MAQZONE`,
    description: auction.description?.slice(0, 160) || `Lote #${auction.id} en subasta. Puja ahora en MAQZONE.`,
    openGraph: {
      title: auction.title,
      description: auction.description?.slice(0, 160),
      images: auction.image_url ? [{ url: auction.image_url }] : [],
    },
  };
}

export default async function SubastaDetalle({
  params,
}: {
  params: { id: string };
}) {
  const auction = await loadAuction(params.id);

  if (!auction) {
    return (
      <div className="section py-20 text-center">
        <h1 className="text-3xl font-semibold text-sand">
          Subasta no encontrada
        </h1>
        <p className="mt-4 text-sand/70">
          Esta subasta no existe o ya fue cerrada.
        </p>
        <Link href="/subastas" className="button-primary mt-8 inline-flex">
          Volver a subastas
        </Link>
      </div>
    );
  }

  const related = await loadRelated(params.id);
  const images = getAuctionImages(auction.image_url);

  return (
    <>
      {/* Breadcrumb */}
      <nav className="section pt-6 sm:pt-8">
        <div className="flex items-center gap-2 text-xs text-sand/50 sm:text-sm">
          <Link href="/" className="transition hover:text-sand">
            Inicio
          </Link>
          <span>/</span>
          <Link href="/subastas" className="transition hover:text-sand">
            Subastas
          </Link>
          <span>/</span>
          <span className="text-sand/80 truncate max-w-[200px] inline-block align-bottom">{auction.title}</span>
        </div>
      </nav>

      {/* Main content */}
      <section className="section pt-6 pb-10 sm:pb-16">
        <div className="grid gap-8 lg:grid-cols-[1.2fr_0.8fr]">
          {/* Left: Image gallery with lightbox */}
          <div className="relative">
            {/* Status badge over gallery */}
            <div className="absolute left-4 top-4 z-10 flex gap-2 pointer-events-none">
              <span className="rounded-full bg-cyan/20 px-3 py-1 text-xs font-semibold text-cyan backdrop-blur">
                {auction.status === "active" ? "EN VIVO" : auction.status.toUpperCase()}
              </span>
              <span className="rounded-full bg-graphite/60 px-3 py-1 text-xs text-sand/80 backdrop-blur">
                Lote #{auction.id}
              </span>
            </div>
            <ImageLightbox images={images} alt={auction.title} />
          </div>

          {/* Right: Details + live bid panel */}
          <div className="space-y-5">
            <div>
              <h1 className="text-2xl font-semibold text-sand sm:text-3xl lg:text-4xl">
                {auction.title}
              </h1>
              <div className="mt-2 flex items-center gap-3 text-sm text-sand/60">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                {auction.location}
              </div>
            </div>

            <p className="text-sm text-sand/70 sm:text-base leading-relaxed">
              {auction.description}
            </p>

            {/* Live Bid Panel with WebSocket */}
            <LiveBidPanel
              auctionId={auction.id}
              currentBid={auction.current_bid}
              reservePrice={auction.reserve_price}
              endTime={auction.end_time}
              status={auction.status}
              minBidIncrement={auction.min_bid_increment ?? 1000}
              priceVisible={auction.price_visible ?? 1}
              buyerPremiumPct={auction.buyer_premium_pct ?? 14}
            />

            {/* Quick actions */}
            <div className="grid grid-cols-2 gap-3">
              <a
                href={waMsg(`Quiero agendar una inspeccion para: ${auction.title} (Lote #${auction.id})`)}
                target="_blank"
                rel="noopener noreferrer"
                className="button-ghost text-xs sm:text-sm"
              >
                Agendar inspeccion
              </a>
              <a
                href={waMsg(`Solicito el reporte de inspeccion de: ${auction.title} (Lote #${auction.id})`)}
                target="_blank"
                rel="noopener noreferrer"
                className="button-ghost text-xs sm:text-sm"
              >
                Pedir reporte
              </a>
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
                ["Marca/Modelo", auction.title],
                ["Ubicacion", auction.location],
                ["Estado", auction.status === "active" ? "Operativo" : auction.status],
                ["Tipo", "Subasta en vivo"],
                ["Verificacion", "Activo certificado"],
                ["Documentacion", "Historial completo"],
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
              Los postores deben inspeccionar los bienes agendando cita previa.
              Horario: 10:00 a 16:00 hrs, con al menos 24 horas de anticipacion.
            </p>
            <div className="space-y-2">
              {[
                "Inspeccion mecanica",
                "Certificado de horas",
                "Historial de mantenimiento",
                "Reporte fotografico",
                "Transparencia de estado",
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
              href={waMsg(`Solicito el reporte completo de inspeccion: ${auction.title} (Lote #${auction.id})`)}
              target="_blank"
              rel="noopener noreferrer"
              className="button-ghost w-full text-xs sm:text-sm"
            >
              Solicitar reporte completo
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
                ["Plazo de pago", "5 dias habiles"],
                ["Prima comprador", `${auction.buyer_premium_pct ?? 14}%`],
                ["IVA", "Incluido (16%)"],
                ["Retiro", "10:00-16:00 hrs"],
                ["Soporte", "Asesoria logistica MAQZONE"],
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

      {/* Garantias */}
      <section className="section pb-10 sm:pb-16">
        <div className="glass rounded-[24px] p-6 sm:rounded-[32px] sm:p-8">
          <h3 className="text-xl font-semibold text-sand sm:text-2xl">
            Garantias de participacion
          </h3>
          <p className="mt-3 text-sm text-sand/70 sm:text-base">
            Para participar en la subasta, deposita tu garantia de participacion.
            Todas las ventas son definitivas, irrevocables y en el estado fisico
            en que se encuentran los bienes. Si no adquieres ningun lote, tu
            garantia se reembolsa en 3 dias habiles.
          </p>
          <div className="mt-6 grid gap-3 grid-cols-2 sm:grid-cols-4">
            {[
              { title: "Paleta Blanca", desc: "$50,000 MXN - 5 lotes" },
              { title: "Paleta Amarilla", desc: "$100,000 MXN - 5 lotes" },
              { title: "Venta as-is", desc: "Sin garantia de estado" },
              { title: "Certeza legal", desc: "Jurisdiccion SLP" },
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
            Subastas relacionadas
          </h2>
          <div className="mt-6 grid gap-4 sm:grid-cols-2 sm:gap-6 lg:grid-cols-3">
            {related.map((r) => (
              <Link
                key={r.id}
                href={`/subastas/${r.id}`}
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
                <div className="flex items-center justify-between">
                  <span className="text-[10px] uppercase tracking-[0.15em] text-sand/50">
                    {r.location}
                  </span>
                  <span className="rounded-full bg-cyan/20 px-2 py-0.5 text-[10px] text-cyan">
                    {formatEndTime(r.end_time)}
                  </span>
                </div>
                <h3 className="mt-2 text-lg font-semibold text-sand">
                  {r.title}
                </h3>
                <p className="mt-2 text-base font-semibold text-ember">
                  ${r.current_bid.toLocaleString("es-MX")} MXN
                </p>
              </Link>
            ))}
          </div>
        </section>
      )}
    </>
  );
}
