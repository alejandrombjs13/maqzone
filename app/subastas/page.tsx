import Link from "next/link";
import Image from "next/image";
import { fetchAuctions } from "../lib/api";
import CountdownTimer from "../components/countdown-timer";

export const metadata = {
  title: "Subastas en vivo | MAQZONE",
  description: "Participa en subastas en tiempo real de maquinaria pesada, vehiculos y equipos industriales.",
};

const statusConfig: Record<string, { label: string; cls: string }> = {
  active: { label: "EN VIVO", cls: "bg-cyan/25 text-cyan" },
  scheduled: { label: "PRÓXIMA", cls: "bg-blue-500/25 text-blue-300" },
  closed: { label: "CERRADA", cls: "bg-sand/20 text-sand/60" },
  paused: { label: "PAUSADA", cls: "bg-orange-500/25 text-orange-300" },
};

export default async function SubastasPage() {
  const auctions = (await fetchAuctions()) ?? [];

  return (
    <div className="section py-8 sm:py-12">
      {/* Header */}
      <div className="mb-8">
        <span className="tag">Subastas</span>
        <h1 className="mt-4 text-2xl font-semibold text-sand sm:text-4xl">
          Subastas en vivo
        </h1>
        <p className="mt-3 max-w-2xl text-sm text-sand/70 sm:text-base">
          Participa en subastas en tiempo real de maquinaria pesada, vehiculos y
          equipos industriales. Pujas anonimas y competencia justa.
        </p>
      </div>

      {auctions.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 sm:gap-6 lg:grid-cols-3">
          {auctions.map((auction) => {
            const sc = statusConfig[auction.status] ?? { label: auction.status.toUpperCase(), cls: "bg-sand/20 text-sand/60" };
            const isBlind = auction.price_visible === 0;
            return (
              <Link
                key={auction.id}
                href={`/subastas/${auction.id}`}
                className="card group flex flex-col transition hover:-translate-y-1"
              >
                {/* Image with overlay badges */}
                <div className="relative mb-3 overflow-hidden rounded-2xl border border-sand/10 sm:mb-4">
                  <Image
                    src={auction.image_url || "/products/haas-sl30t/1.png"}
                    alt={auction.title}
                    width={600}
                    height={360}
                    className="h-40 w-full object-cover transition group-hover:scale-[1.02] sm:h-48"
                  />
                  <div className="absolute left-3 top-3 flex flex-wrap gap-1.5">
                    <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-semibold backdrop-blur-sm ${sc.cls}`}>
                      {sc.label}
                    </span>
                    {isBlind && (
                      <span className="rounded-full bg-graphite/70 px-2.5 py-0.5 text-[10px] text-sand/70 backdrop-blur-sm">
                        Precio oculto
                      </span>
                    )}
                  </div>
                  <span className="absolute bottom-3 right-3 rounded-full bg-graphite/70 px-2 py-0.5 text-[10px] text-sand/70 backdrop-blur-sm">
                    Lote #{auction.id}
                  </span>
                </div>

                {/* Location */}
                <p className="text-[10px] uppercase tracking-[0.15em] text-sand/60 sm:text-xs sm:tracking-[0.2em]">
                  {auction.location}
                </p>

                {/* Title */}
                <h3 className="mt-2 text-base font-semibold text-sand sm:text-lg">
                  {auction.title}
                </h3>

                {/* Description */}
                <p className="mt-1 line-clamp-2 text-xs text-sand/50 sm:text-sm">
                  {auction.description}
                </p>

                {/* Bid + reserve */}
                <div className="mt-4 flex items-end justify-between gap-2">
                  <div>
                    <p className="text-[10px] uppercase tracking-[0.15em] text-sand/60 sm:text-xs">
                      Puja actual
                    </p>
                    {isBlind ? (
                      <p className="text-base font-semibold text-sand/40 sm:text-lg">Oculta</p>
                    ) : (
                      <p className="text-base font-semibold text-ember sm:text-lg">
                        ${auction.current_bid.toLocaleString("es-MX")} MXN
                      </p>
                    )}
                  </div>
                  {auction.reserve_price > 0 && !isBlind && (
                    <p className="text-xs text-sand/40">
                      Reserva ${auction.reserve_price.toLocaleString("es-MX")}
                    </p>
                  )}
                </div>

                {/* Countdown */}
                <div className="mt-4">
                  <CountdownTimer endTime={auction.end_time} />
                </div>
              </Link>
            );
          })}
        </div>
      ) : (
        <div className="glass rounded-[24px] p-8 sm:rounded-[32px] sm:p-12 text-center">
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-sand/10">
            <svg className="h-8 w-8 text-sand/40" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M7 7h.01M7 3h5a1.99 1.99 0 011.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A2 2 0 013 12V7a4 4 0 014-4z" />
            </svg>
          </div>
          <p className="text-xl font-semibold text-sand sm:text-2xl">
            Proximamente
          </p>
          <p className="mt-3 text-sm text-sand/70 sm:text-base">
            Estamos preparando nuestras primeras subastas en vivo. Registrate
            para recibir notificaciones cuando esten disponibles.
          </p>
          <Link
            href="/auth/registro"
            className="button-primary mt-6 inline-flex"
          >
            Registrate para pujar
          </Link>
        </div>
      )}
    </div>
  );
}
