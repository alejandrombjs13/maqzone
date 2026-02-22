"use client";

import Image from "next/image";
import Link from "next/link";
import { useState, useRef, useEffect } from "react";
import { usePathname } from "next/navigation";
import { useAuth } from "./auth-provider";
import { categories } from "../lib/categories";

const navLinks = [
  { label: "Inicio", href: "/" },
  { label: "Catalogo", href: "/catalogo", hasDropdown: true },
  { label: "Subastas", href: "/subastas" },
  { label: "Contacto", href: "/#contacto" },
];

export default function Navbar() {
  const { user, logout, loading } = useAuth();
  const pathname = usePathname();
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [catMenuOpen, setCatMenuOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [mobileCatOpen, setMobileCatOpen] = useState(false);
  const userRef = useRef<HTMLDivElement>(null);
  const catRef = useRef<HTMLDivElement>(null);

  function isActive(href: string) {
    if (href === "/") return pathname === "/";
    return pathname.startsWith(href);
  }

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (userRef.current && !userRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false);
      }
      if (catRef.current && !catRef.current.contains(e.target as Node)) {
        setCatMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 768px)");
    function onChange() {
      if (mq.matches) { setMobileOpen(false); setMobileCatOpen(false); }
    }
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [mobileOpen]);

  function closeMobile() {
    setMobileOpen(false);
    setMobileCatOpen(false);
  }

  return (
    <>
      <nav className="flex items-center justify-between px-1 py-1 sm:px-2 sm:py-2">
        {/* Logo */}
        <Link
          href="/"
          className="flex items-center gap-2 transition hover:opacity-80"
          onClick={closeMobile}
        >
          <Image
            src="/maqzone-logo.jpg"
            alt="Logo MAQZONE"
            width={48}
            height={48}
            className="h-8 w-8 rounded-full border border-sand/30 bg-white/90 p-0.5 sm:h-11 sm:w-11 sm:p-1"
          />
          <p className="font-display text-base tracking-[0.15em] text-sand sm:text-xl md:text-2xl">
            MAQZONE
          </p>
        </Link>

        {/* Desktop nav links */}
        <div className="hidden items-center gap-1 text-sm text-sand/70 md:flex">
          {navLinks.map((link) =>
            link.hasDropdown ? (
              <div key={link.href} className="relative" ref={catRef}>
                <div className="flex items-center">
                  <Link
                    className={`rounded-lg px-3 py-2 transition hover:bg-sand/5 hover:text-sand ${isActive(link.href) ? "text-sand font-medium" : ""}`}
                    href={link.href}
                  >
                    {link.label}
                  </Link>
                  <button
                    onClick={() => setCatMenuOpen(!catMenuOpen)}
                    className="rounded-lg p-1.5 transition hover:bg-sand/5 hover:text-sand"
                    aria-label="Ver categorias"
                  >
                    <svg
                      className={`h-3.5 w-3.5 transition-transform ${catMenuOpen ? "rotate-180" : ""}`}
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2.5}
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                </div>
                {catMenuOpen && (
                  <div className="absolute left-0 top-full mt-2 w-56 rounded-xl border border-sand/10 bg-steel/95 py-1 shadow-xl backdrop-blur z-50">
                    {categories.map((cat) => (
                      <Link
                        key={cat.slug}
                        href={`/catalogo?categoria=${cat.slug}`}
                        className="block px-4 py-2.5 text-sm text-sand/70 transition hover:bg-sand/5 hover:text-sand"
                        onClick={() => setCatMenuOpen(false)}
                      >
                        {cat.name}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <Link
                key={link.href}
                className={`rounded-lg px-3 py-2 transition hover:bg-sand/5 hover:text-sand ${isActive(link.href) ? "text-sand font-medium" : ""}`}
                href={link.href}
              >
                {link.label}
              </Link>
            )
          )}
        </div>

        {/* Right side */}
        <div className="flex items-center gap-2">
          {!loading && user ? (
            <div className="relative hidden md:block" ref={userRef}>
              <button
                className="button-ghost inline-flex items-center gap-2 !px-4 !py-2 text-sm"
                onClick={() => setUserMenuOpen(!userMenuOpen)}
              >
                <span className="max-w-[100px] truncate">
                  {user.business_name || user.email.split("@")[0]}
                </span>
                <svg
                  className={`h-3.5 w-3.5 transition-transform ${userMenuOpen ? "rotate-180" : ""}`}
                  fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {userMenuOpen && (
                <div className="absolute right-0 top-full mt-2 w-48 rounded-xl border border-sand/10 bg-steel/95 shadow-xl backdrop-blur z-50">
                  <Link
                    href="/auth/perfil"
                    className="block px-4 py-3 text-sm text-sand/80 transition hover:bg-sand/5 hover:text-sand rounded-t-xl"
                    onClick={() => setUserMenuOpen(false)}
                  >
                    Mi perfil
                  </Link>
                  <button
                    onClick={() => { logout(); setUserMenuOpen(false); }}
                    className="block w-full px-4 py-3 text-left text-sm text-sand/80 transition hover:bg-sand/5 hover:text-sand rounded-b-xl"
                  >
                    Cerrar sesion
                  </button>
                </div>
              )}
            </div>
          ) : (
            <Link href="/auth/login" className="button-ghost hidden text-sm md:inline-flex !px-4 !py-2">
              Acceder
            </Link>
          )}

          {!loading && !user && (
            <Link
              href="/auth/registro"
              className="button-primary hidden sm:inline-flex !px-4 !py-2 text-xs sm:text-sm"
            >
              Registrate
            </Link>
          )}

          {/* Mobile hamburger */}
          <button
            className="flex h-10 w-10 items-center justify-center rounded-xl text-sand transition active:scale-90 md:hidden"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label={mobileOpen ? "Cerrar menu" : "Abrir menu"}
          >
            {mobileOpen ? (
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            )}
          </button>
        </div>
      </nav>

      {/* Mobile fullscreen overlay menu */}
      {mobileOpen && (
        <div className="fixed inset-0 top-[56px] z-50 bg-graphite/98 backdrop-blur-xl md:hidden overflow-y-auto">
          <div className="section py-6 space-y-2">
            {navLinks.map((link) =>
              link.hasDropdown ? (
                <div key={link.href}>
                  <div className="flex items-center">
                    <Link
                      href={link.href}
                      className={`flex-1 rounded-2xl px-4 py-3.5 text-base font-medium transition active:bg-sand/5 ${isActive(link.href) ? "text-sand" : "text-sand/80"}`}
                      onClick={closeMobile}
                    >
                      {link.label}
                    </Link>
                    <button
                      onClick={() => setMobileCatOpen(!mobileCatOpen)}
                      className="rounded-2xl px-4 py-3.5 text-sand/40 transition active:bg-sand/5"
                      aria-label="Ver categorias"
                    >
                      <svg
                        className={`h-5 w-5 transition-transform ${mobileCatOpen ? "rotate-180" : ""}`}
                        fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                  </div>
                  {mobileCatOpen && (
                    <div className="ml-4 mt-1 mb-2 space-y-0.5 border-l-2 border-cyan/20 pl-4">
                      {categories.map((cat) => (
                        <Link
                          key={cat.slug}
                          href={`/catalogo?categoria=${cat.slug}`}
                          className="block rounded-xl px-3 py-2.5 text-sm text-sand/60 transition active:bg-sand/5 active:text-sand"
                          onClick={closeMobile}
                        >
                          {cat.name}
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`block rounded-2xl px-4 py-3.5 text-base font-medium transition active:bg-sand/5 ${isActive(link.href) ? "text-sand" : "text-sand/80"}`}
                  onClick={closeMobile}
                >
                  {link.label}
                </Link>
              )
            )}

            <div className="!my-4 border-t border-sand/10" />

            {!loading && user ? (
              <>
                <Link
                  href="/auth/perfil"
                  className="block rounded-2xl px-4 py-3.5 text-base font-medium text-sand/80 transition active:bg-sand/5"
                  onClick={closeMobile}
                >
                  Mi perfil
                </Link>
                <button
                  onClick={() => { logout(); closeMobile(); }}
                  className="block w-full rounded-2xl px-4 py-3.5 text-left text-base font-medium text-sand/80 transition active:bg-sand/5"
                >
                  Cerrar sesion
                </button>
              </>
            ) : (
              <Link
                href="/auth/login"
                className="block rounded-2xl px-4 py-3.5 text-base font-medium text-sand/80 transition active:bg-sand/5"
                onClick={closeMobile}
              >
                Acceder
              </Link>
            )}

            {!loading && !user && (
              <div className="!mt-6">
                <Link
                  href="/auth/registro"
                  className="button-primary w-full text-base"
                  onClick={closeMobile}
                >
                  Registrate para pujar
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
