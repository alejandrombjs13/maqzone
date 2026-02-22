import "./globals.css";
import type { Metadata, Viewport } from "next";
import { Bebas_Neue, Manrope } from "next/font/google";
import Link from "next/link";
import AuthProvider from "./components/auth-provider";
import Navbar from "./components/navbar";
import BottomNav from "./components/bottom-nav";

const bebasNeue = Bebas_Neue({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-bebas",
  display: "swap",
});

const manrope = Manrope({
  weight: ["300", "400", "600", "700", "800"],
  subsets: ["latin"],
  variable: "--font-manrope",
  display: "swap",
});

export const metadata: Metadata = {
  title: "MAQZONE | Centro de Activos Industriales",
  description:
    "El punto de encuentro de activos con valor real. Tienda en linea de equipos certificados y ecosistema de subastas de maquinaria pesada.",
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "https://maqzone.mx"),
  openGraph: {
    title: "MAQZONE | Centro de Activos Industriales",
    description: "Tienda en linea de equipos certificados y ecosistema de subastas de maquinaria pesada.",
    type: "website"
  }
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#0f1419"
};

export default function RootLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" suppressHydrationWarning className={`${bebasNeue.variable} ${manrope.variable}`}>
      <head>
        <script dangerouslySetInnerHTML={{ __html: `
          window.addEventListener('error', function(e) {
            if (e.message && (e.message.includes('ethereum') || e.message.includes('selectedAddress'))) {
              e.preventDefault();
            }
          });
        `}} />
      </head>
      <body className="bg-graphite text-sand font-body">
        <AuthProvider>
          <div className="relative overflow-x-hidden min-h-screen">
            <div className="absolute inset-0 bg-grid-fade opacity-80" />

            {/* Shared Navbar */}
            <header className="sticky top-0 z-40 section pt-4 pb-2 sm:pt-6 sm:pb-3 bg-graphite/80 backdrop-blur-lg border-b border-sand/5">
              <Navbar />
            </header>

            {/* Page content */}
            <div className="relative z-10">
              {children}
            </div>

            {/* Shared Footer */}
            <footer className="relative z-10 section pb-24 md:pb-10">
              <div className="flex flex-col gap-4 border-t border-sand/10 pt-6 sm:flex-row sm:items-center sm:justify-between sm:gap-6 sm:pt-8">
                <Link href="/" className="transition hover:opacity-80">
                  <p className="font-display text-xl tracking-[0.2em] text-sand sm:text-2xl">
                    MAQZONE
                  </p>
                  <p className="text-[10px] uppercase tracking-[0.3em] text-sand/60 sm:text-xs">
                    Centro de Activos Industriales
                  </p>
                </Link>
                <div className="flex flex-col items-start gap-2 sm:items-end">
                  <div className="flex gap-4 text-xs text-sand/50">
                    <a href="/docs/terminos-de-venta-maqzone.html" target="_blank" className="transition hover:text-sand">
                      Terminos de venta
                    </a>
                    <a href="/docs/hoja-de-registro-maqzone.html" target="_blank" className="transition hover:text-sand">
                      Hoja de registro
                    </a>
                  </div>
                  <p className="text-xs text-sand/60 sm:text-sm">
                    2026 &copy; MAQZONE &middot; San Luis Potosi, S.L.P.
                  </p>
                </div>
              </div>
            </footer>

            {/* Shared Bottom Nav (mobile) */}
            <BottomNav />
          </div>
        </AuthProvider>
      </body>
    </html>
  );
}
