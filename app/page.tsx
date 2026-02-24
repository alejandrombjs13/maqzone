import Link from "next/link";
import HeroCarousel, { type Slide } from "./components/hero-carousel";
import ClientLogos, { type Logo } from "./components/client-logos";
import ProductCard from "./components/product-card";
import ScrollReveal from "./components/scroll-reveal";
import { fetchListings, WA_LINK } from "./lib/api";
import { categories } from "./lib/categories";

/* ── Static Data ─────────────────────────────────────── */

const heroSlides: Slide[] = [
  { type: "image", src: "/products/haas-sl30t/1.jpg", alt: "Torno HAAS SL-30T" },
  { type: "image", src: "/products/goodwill-gc18s/1.jpg", alt: "Rectificadora Goodwill GC-18S" },
  { type: "image", src: "/products/freightliner-cascadia-2019/1.jpg", alt: "Freightliner Cascadia 2019" },
  { type: "image", src: "/products/freightliner-m2-2016/1.jpg", alt: "Freightliner M2 106 Caja Refrigerada" },
];

const clientLogos: Logo[] = [
  { name: "HAAS", initial: "HS" },
  { name: "Doosan", initial: "DS" },
  { name: "Goodwill", initial: "GW" },
  { name: "Freightliner", initial: "FL" },
  { name: "Cummins", initial: "CM" },
  { name: "Fanuc", initial: "FN" },
  { name: "Carrier", initial: "CR" },
  { name: "Detroit Diesel", initial: "DD" },
  { name: "Toyota", initial: "TY" },
  { name: "Caterpillar", initial: "CAT" },
];

const stats = [
  { label: "Lotes activos", value: "240+" },
  { label: "Postores verificados", value: "1,350" },
  { label: "Pago maximo", value: "5 dias" },
  { label: "Activos certificados", value: "100%" },
];

const steps = [
  { num: "01", title: "Registrate y valida tu cuenta", text: "Crea tu cuenta, envia tu documentacion (INE, RFC, constancia fiscal) y deposita tu garantia de participacion." },
  { num: "02", title: "Inspecciona el activo", text: "Agenda visita presencial o solicita el reporte de inspeccion completo: mecanica, horas, historial y fotos." },
  { num: "03", title: "Puja en vivo o compra directo", text: "Participa en subastas en tiempo real o adquiere activos a precio fijo. Pujas anónimas y competencia justa." },
  { num: "04", title: "Paga y retira en 5 dias", text: "Transferencia bancaria en 5 dias habiles. Prima del comprador incluida. Retiro coordinado por MAQZONE." },
];

const valueProps = [
  { title: "Activo certificado", desc: "Inspeccion, horas y estado verificados." },
  { title: "Logistica resuelta", desc: "Importacion, transporte y entrega." },
  { title: "Pujas anónimas", desc: "Competencia justa, sin manipulación." },
];

/* ── Page ─────────────────────────────────────────────── */

export default async function Home() {
  const listings = await fetchListings(8);

  return (
    <>
      {/* Preload LCP — la imagen del carousel arranca antes de que hidrate React */}
      <link rel="preload" as="image" href={heroSlides[0].src} fetchPriority="high" />

      {/* ── Hero Carousel ───────────────────────────────── */}
      <section className="section pt-6 sm:pt-8">
        <HeroCarousel slides={heroSlides} />
      </section>

      {/* ── Hero Text + Stats ───────────────────────────── */}
      <section id="inicio" className="section pt-10 sm:pt-16">
        <div className="mx-auto max-w-4xl space-y-5 text-center sm:space-y-6">
          <span className="tag">Centro de activos industriales</span>
          <h1 className="text-3xl font-semibold text-sand sm:text-4xl lg:text-6xl !leading-tight">
            El punto de encuentro de activos con
            <span className="gradient-text"> valor real</span>.
          </h1>
          <p className="mx-auto max-w-2xl text-base text-sand/70 sm:text-lg">
            Compra y vende maquinaria pesada, vehiculos y equipos industriales
            con certeza legal, inspeccion verificada y logistica resuelta.
            Subastas en vivo y venta directa desde San Luis Potosi.
          </p>
          <div className="flex flex-wrap justify-center gap-3 sm:gap-4">
            <Link href="/auth/registro" className="button-primary">
              Registrate para pujar
            </Link>
            <Link href="/catalogo" className="button-ghost">
              Ver catalogo
            </Link>
          </div>
          <div className="mx-auto grid max-w-3xl grid-cols-2 gap-3 sm:grid-cols-4">
            {stats.map((stat) => (
              <div key={stat.label} className="card text-center">
                <p className="text-xl font-semibold text-sand sm:text-2xl">{stat.value}</p>
                <p className="text-[10px] uppercase tracking-[0.15em] text-sand/60 sm:text-xs sm:tracking-[0.2em]">
                  {stat.label}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Featured Products ───────────────────────────── */}
      <ScrollReveal className="section pt-16 sm:pt-20">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between sm:gap-6">
          <div>
            <span className="tag">Catalogo activo</span>
            <h2 className="mt-4 text-2xl font-semibold text-sand sm:text-3xl">
              Productos destacados
            </h2>
            <p className="mt-2 text-sm text-sand/70 sm:text-base">
              Equipos verificados con inspeccion, certificado de horas y
              disponibilidad de entrega inmediata.
            </p>
          </div>
          <Link href="/catalogo" className="button-ghost self-start">
            Ver catalogo completo
          </Link>
        </div>
        <div className="mt-6 grid gap-4 sm:mt-8 sm:grid-cols-2 sm:gap-6 lg:grid-cols-4">
          {listings.slice(0, 4).map((listing) => (
            <ProductCard key={listing.id} listing={listing} variant="featured" />
          ))}
        </div>
      </ScrollReveal>

      {/* ── Categories Strip ────────────────────────────── */}
      <ScrollReveal className="section pt-16 sm:pt-20">
        <h2 className="text-2xl font-semibold text-sand sm:text-3xl">
          Categorias de activos
        </h2>
        <p className="mt-3 text-sm text-sand/70 sm:text-base">
          Inventario curado para manufactura, transporte y logistica.
        </p>
        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
          {categories.map((cat) => (
            <Link
              key={cat.slug}
              href={`/catalogo?categoria=${cat.slug}`}
              className="card flex items-center gap-4 transition hover:-translate-y-0.5"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-cyan/10">
                <svg className="h-5 w-5 text-cyan" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d={cat.icon} />
                </svg>
              </div>
              <p className="text-sm font-semibold text-sand">{cat.name}</p>
            </Link>
          ))}
        </div>
      </ScrollReveal>

      {/* ── Client Logos ────────────────────────────────── */}
      <ScrollReveal className="section pt-10 sm:pt-12">
        <p className="mb-6 text-center text-xs uppercase tracking-[0.3em] text-sand/50 sm:text-sm">
          Empresas que confian en MAQZONE
        </p>
        <ClientLogos logos={clientLogos} />
      </ScrollReveal>

      {/* ── Value Proposition ───────────────────────────── */}
      <ScrollReveal className="section pt-16 sm:pt-20">
        <span className="tag">Por que MAQZONE</span>
        <h2 className="mt-4 text-2xl font-semibold text-sand sm:text-3xl">
          Transparencia y certeza en cada operacion.
        </h2>
        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
          {valueProps.map((v) => (
            <div key={v.title} className="card">
              <p className="text-base font-semibold text-sand sm:text-lg">{v.title}</p>
              <p className="text-xs text-sand/60 sm:text-sm">{v.desc}</p>
            </div>
          ))}
        </div>
      </ScrollReveal>

      {/* ── How It Works ────────────────────────────────── */}
      <ScrollReveal className="section pt-16 sm:pt-20">
        <div className="grid gap-6 sm:gap-8 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="glass rounded-[24px] p-6 sm:rounded-[32px] sm:p-8">
            <h2 className="text-2xl font-semibold text-sand sm:text-3xl">
              Como funciona MAQZONE
            </h2>
            <p className="mt-3 text-sm text-sand/70 sm:text-base">
              Un proceso claro y seguro para que adquieras maquinaria industrial
              con certeza total, desde el registro hasta el retiro del equipo.
            </p>
          </div>
          <div className="grid gap-3 sm:gap-4">
            {steps.map((step) => (
              <div key={step.title} className="card flex gap-4 sm:gap-6">
                <span className="shrink-0 font-display text-3xl text-cyan/40 sm:text-4xl">
                  {step.num}
                </span>
                <div>
                  <h3 className="text-base font-semibold text-sand sm:text-lg">{step.title}</h3>
                  <p className="text-xs text-sand/60 sm:text-sm">{step.text}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </ScrollReveal>

      {/* ── CTA Banner ──────────────────────────────────── */}
      <section id="contacto" className="section py-16 sm:py-20">
        <div className="glass grid gap-6 rounded-[24px] p-6 sm:gap-8 sm:rounded-[32px] sm:p-10 lg:grid-cols-[1.1fr_0.9fr]">
          <div>
            <span className="tag">Contacto</span>
            <h2 className="mt-4 text-2xl font-semibold text-sand sm:text-3xl">
              Tienes dudas? Hablemos directo.
            </h2>
            <p className="mt-3 text-sm text-sand/70 sm:text-base">
              Ya sea que quieras comprar, vender o simplemente conocer como
              funciona MAQZONE, nuestro equipo te atiende de forma personalizada.
            </p>
            <div className="mt-6 flex flex-wrap gap-3 sm:gap-4">
              <a href={WA_LINK} target="_blank" rel="noopener noreferrer" className="button-primary">
                WhatsApp directo
              </a>
              <a href="mailto:contacto@maqzone.mx" className="button-ghost">
                contacto@maqzone.mx
              </a>
            </div>
          </div>
          <div className="space-y-4">
            <div className="card">
              <p className="text-[10px] uppercase tracking-[0.15em] text-sand/60 sm:text-xs sm:tracking-[0.2em]">
                Ubicacion
              </p>
              <p className="mt-2 text-base font-semibold text-sand sm:text-lg">
                San Luis Potosi, S.L.P.
              </p>
              <p className="text-xs text-sand/60 sm:text-sm">
                Hub logistico central de Mexico.
              </p>
            </div>
            <div className="card">
              <p className="text-[10px] uppercase tracking-[0.15em] text-sand/60 sm:text-xs sm:tracking-[0.2em]">
                WhatsApp directo
              </p>
              <a
                href={WA_LINK}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2 block text-base font-semibold text-sand transition hover:text-ember sm:text-lg"
              >
                +52 444 216 4550
              </a>
              <p className="text-xs text-sand/60 sm:text-sm">
                Lun - Vie 9:00-18:00 hrs
              </p>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
