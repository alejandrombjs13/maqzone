"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { useAuth } from "../../components/auth-provider";
import { waMsg } from "../../lib/api";

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE ||
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  "http://localhost:8080";

const statusLabels: Record<string, { label: string; color: string }> = {
  pending: { label: "Pendiente de aprobacion", color: "bg-yellow-500/20 text-yellow-400" },
  approved: { label: "Cuenta aprobada", color: "bg-cyan/20 text-cyan" },
  rejected: { label: "Cuenta rechazada", color: "bg-ember/20 text-ember" },
};

const tierLabels: Record<string, string> = {
  "50k": "Paleta Blanca - $50,000 MXN (5 oportunidades)",
  "100k": "Paleta Amarilla - $100,000 MXN (5 oportunidades)",
};

const listingStatusMeta: Record<string, { label: string; color: string }> = {
  active:   { label: "Disponible",     color: "bg-cyan/20 text-cyan" },
  sold:     { label: "Vendido",        color: "bg-ember/20 text-ember" },
  inactive: { label: "Retirado",       color: "bg-sand/10 text-sand/50" },
  auction:  { label: "En subasta",     color: "bg-yellow-500/20 text-yellow-400" },
};

type LikedItem = {
  id: number;
  listing_id: number;
  seen_status: string;
  seen_price: number;
  created_at: string;
  title: string;
  description: string;
  location: string;
  price: number;
  sale_type: string;
  year: number;
  current_status: string;
  image_url: string;
};

const LIKE_FILTERS = [
  { key: "todos",    label: "Todos" },
  { key: "active",   label: "Disponible" },
  { key: "auction",  label: "En subasta" },
  { key: "sold",     label: "Vendido" },
  { key: "changed",  label: "Con cambios" },
] as const;

type LikeFilter = (typeof LIKE_FILTERS)[number]["key"];

export default function PerfilPage() {
  const { user, loading, logout, openPasswordModal, token } = useAuth();
  const router = useRouter();

  const [likes, setLikes] = useState<LikedItem[]>([]);
  const [likesLoading, setLikesLoading] = useState(false);
  const [likeFilter, setLikeFilter] = useState<LikeFilter>("todos");

  useEffect(() => {
    if (!loading && !user) router.push("/auth/login");
    if (!loading && user?.must_change_password) openPasswordModal();
  }, [loading, user, router, openPasswordModal]);

  const fetchLikes = useCallback(async () => {
    const t = localStorage.getItem("maqzone_token") || token;
    if (!t) return;
    setLikesLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/likes`, {
        headers: { Authorization: `Bearer ${t}` },
      });
      if (res.ok) {
        const data = await res.json();
        setLikes(data || []);
      }
    } catch {}
    setLikesLoading(false);
    // Mark all seen after loading
    const t2 = localStorage.getItem("maqzone_token") || token;
    if (t2) {
      fetch(`${API_BASE}/api/likes/mark-seen`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${t2}` },
      }).catch(() => {});
    }
  }, [token]);

  useEffect(() => {
    if (user && !loading) fetchLikes();
  }, [user, loading, fetchLikes]);

  async function unlike(listingId: number) {
    const t = localStorage.getItem("maqzone_token") || token;
    if (!t) return;
    await fetch(`${API_BASE}/api/likes/${listingId}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${t}` },
    });
    setLikes((prev) => prev.filter((l) => l.listing_id !== listingId));
  }

  if (loading || !user) {
    return (
      <section className="section py-20 flex items-center justify-center">
        <div className="flex items-center gap-3 text-sand/60">
          <svg className="h-5 w-5 animate-spin" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          Cargando perfil...
        </div>
      </section>
    );
  }

  const status = statusLabels[user.status] || statusLabels.pending;

  const changedLikes = likes.filter(
    (l) => l.current_status !== l.seen_status || l.price !== l.seen_price,
  );

  const filteredLikes =
    likeFilter === "todos"
      ? likes
      : likeFilter === "changed"
      ? changedLikes
      : likes.filter((l) => l.current_status === likeFilter);

  return (
    <section className="section py-10 sm:py-16">
      <div className="mx-auto max-w-3xl space-y-6">
        {/* Password change required banner */}
        {user.must_change_password && (
          <div className="flex items-start gap-3 rounded-[16px] border border-yellow-500/30 bg-yellow-500/10 p-4">
            <svg className="mt-0.5 h-5 w-5 shrink-0 text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div className="flex-1">
              <p className="text-sm font-semibold text-yellow-400">Debes actualizar tu contrasena</p>
              <p className="mt-0.5 text-xs text-sand/70">
                Por seguridad, cambia tu contrasena antes de usar la plataforma.
              </p>
            </div>
            <button onClick={openPasswordModal} className="button-primary shrink-0 text-xs">
              Cambiar ahora
            </button>
          </div>
        )}

        {/* Status banner */}
        <div className="glass rounded-[24px] p-6 sm:rounded-[32px] sm:p-8">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <span className={`inline-block rounded-full px-3 py-1 text-xs font-semibold ${status.color}`}>
                {status.label}
              </span>
              <h1 className="mt-3 text-2xl font-semibold text-sand sm:text-3xl">
                {user.business_name || user.email}
              </h1>
              <p className="mt-1 text-sm text-sand/60">{user.email}</p>
            </div>
            <button onClick={logout} className="button-ghost text-sm">
              Cerrar sesion
            </button>
          </div>

          {user.status === "rejected" && user.rejection_reason && (
            <div className="mt-4 rounded-xl bg-ember/10 p-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-ember/80">Razon del rechazo</p>
              <p className="mt-1 text-sm text-sand/80">{user.rejection_reason}</p>
            </div>
          )}

          {user.status === "pending" && (
            <div className="mt-4 rounded-xl bg-yellow-500/10 p-4">
              <p className="text-sm text-sand/80">
                Tu cuenta esta pendiente de aprobacion. Envia tus documentos
                por WhatsApp para agilizar el proceso.
              </p>
              <a
                href={waMsg(`Hola MAQZONE, me registre con el email ${user.email}. Adjunto mis documentos para verificacion.`)}
                target="_blank"
                rel="noopener noreferrer"
                className="button-primary mt-3 inline-flex text-sm"
              >
                Enviar documentos por WhatsApp
              </a>
            </div>
          )}
        </div>

        {/* Guarantee tier */}
        {user.status === "approved" && (
          <div className="glass rounded-[24px] p-6 sm:rounded-[32px] sm:p-8">
            <h2 className="text-lg font-semibold text-sand">Garantia de participacion</h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div className="card">
                <p className="text-xs uppercase tracking-wider text-sand/50">Nivel</p>
                <p className="mt-1 text-sm font-semibold text-sand">
                  {tierLabels[user.guarantee_tier] || "Sin asignar"}
                </p>
              </div>
              <div className="card">
                <p className="text-xs uppercase tracking-wider text-sand/50">Oportunidades restantes</p>
                <p className="mt-1 text-2xl font-semibold text-cyan">
                  {user.remaining_opportunities}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* ── Mis favoritos ── */}
        <div className="glass rounded-[24px] p-6 sm:rounded-[32px] sm:p-8">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <h2 className="text-lg font-semibold text-sand">Mis favoritos</h2>
              {changedLikes.length > 0 && (
                <span className="rounded-full bg-ember px-2 py-0.5 text-[10px] font-semibold text-white">
                  {changedLikes.length} nuevo{changedLikes.length > 1 ? "s" : ""}
                </span>
              )}
            </div>
            {likes.length > 0 && (
              <span className="text-xs text-sand/40">{likes.length} guardado{likes.length > 1 ? "s" : ""}</span>
            )}
          </div>

          {/* Filter tabs */}
          {likes.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-2">
              {LIKE_FILTERS.map((f) => {
                const count =
                  f.key === "todos"
                    ? likes.length
                    : f.key === "changed"
                    ? changedLikes.length
                    : likes.filter((l) => l.current_status === f.key).length;
                if (f.key !== "todos" && f.key !== "changed" && count === 0) return null;
                return (
                  <button
                    key={f.key}
                    onClick={() => setLikeFilter(f.key)}
                    className={`rounded-full px-3 py-1 text-xs font-semibold transition
                      ${likeFilter === f.key
                        ? f.key === "changed"
                          ? "bg-ember text-white"
                          : "bg-cyan/20 text-cyan"
                        : "bg-sand/10 text-sand/60 hover:bg-sand/20"
                      }`}
                  >
                    {f.label}
                    {count > 0 && ` (${count})`}
                  </button>
                );
              })}
            </div>
          )}

          {/* List */}
          {likesLoading ? (
            <div className="mt-6 flex items-center gap-3 text-sand/50 text-sm">
              <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Cargando favoritos...
            </div>
          ) : filteredLikes.length === 0 ? (
            <div className="mt-6 text-center py-8">
              <svg className="mx-auto h-10 w-10 text-sand/20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
              </svg>
              <p className="mt-3 text-sm text-sand/40">
                {likes.length === 0
                  ? "Guarda productos desde el catalogo para verlos aqui"
                  : "Sin resultados en este filtro"}
              </p>
              {likes.length === 0 && (
                <Link href="/catalogo" className="button-primary mt-4 inline-flex text-sm">
                  Explorar catalogo
                </Link>
              )}
            </div>
          ) : (
            <div className="mt-4 space-y-3">
              {filteredLikes.map((item) => {
                const changed =
                  item.current_status !== item.seen_status ||
                  item.price !== item.seen_price;
                const meta =
                  listingStatusMeta[item.current_status] ||
                  listingStatusMeta.active;
                return (
                  <div
                    key={item.id}
                    className={`flex gap-4 rounded-2xl border p-3 transition ${
                      changed
                        ? "border-ember/30 bg-ember/5"
                        : "border-sand/10 bg-graphite/30"
                    }`}
                  >
                    {/* Thumbnail */}
                    <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-xl">
                      <Image
                        src={item.image_url || "/products/haas-sl30t/1.png"}
                        alt={item.title}
                        fill
                        className="object-cover"
                      />
                    </div>

                    {/* Info */}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start gap-2">
                        <p className="flex-1 truncate text-sm font-semibold text-sand">
                          {item.title}
                        </p>
                        {changed && (
                          <span className="shrink-0 rounded-full bg-ember px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-white">
                            Cambio
                          </span>
                        )}
                      </div>
                      <div className="mt-1 flex flex-wrap items-center gap-2">
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${meta.color}`}>
                          {meta.label}
                        </span>
                        {item.price > 0 && (
                          <span className="text-xs font-semibold text-ember">
                            ${item.price.toLocaleString("es-MX")} MXN
                          </span>
                        )}
                        {changed && item.price !== item.seen_price && item.seen_price > 0 && (
                          <span className="text-[10px] text-sand/40 line-through">
                            ${item.seen_price.toLocaleString("es-MX")}
                          </span>
                        )}
                      </div>
                      <p className="mt-1 text-[10px] text-sand/40">{item.location}</p>
                    </div>

                    {/* Actions */}
                    <div className="flex shrink-0 flex-col items-end gap-2">
                      <Link
                        href={`/productos/${item.listing_id}`}
                        className="rounded-lg bg-sand/10 px-3 py-1.5 text-xs font-medium text-sand/70 transition hover:bg-sand/20 hover:text-sand"
                      >
                        Ver
                      </Link>
                      <button
                        onClick={() => unlike(item.listing_id)}
                        className="rounded-lg px-3 py-1.5 text-xs text-sand/30 transition hover:text-ember"
                        title="Quitar de favoritos"
                      >
                        <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                        </svg>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Company details */}
        <div className="glass rounded-[24px] p-6 sm:rounded-[32px] sm:p-8">
          <h2 className="text-lg font-semibold text-sand">Datos de la empresa</h2>
          <div className="mt-4 space-y-3">
            {[
              ["Representante Legal", user.legal_representative],
              ["RFC", user.rfc],
              ["Direccion", [user.street_address, user.colony, user.municipality].filter(Boolean).join(", ")],
              ["Ciudad/Estado", [user.city, user.state, user.postal_code].filter(Boolean).join(", ")],
              ["Telefono", user.phone],
              ["Celular", user.mobile],
            ].filter(([, v]) => v).map(([label, value]) => (
              <div key={label} className="flex justify-between border-b border-sand/10 pb-2">
                <span className="text-xs text-sand/50 sm:text-sm">{label}</span>
                <span className="text-xs font-semibold text-sand sm:text-sm">{value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Documents */}
        <div className="glass rounded-[24px] p-6 sm:rounded-[32px] sm:p-8">
          <h2 className="text-lg font-semibold text-sand">Documentos</h2>
          <p className="mt-2 text-sm text-sand/60">
            Descarga los formatos necesarios para completar tu registro.
          </p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <a
              href="/docs/hoja-de-registro-maqzone.html"
              target="_blank"
              className="card flex items-center gap-3 transition hover:border-sand/30"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-cyan/10">
                <svg className="h-5 w-5 text-cyan" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-semibold text-sand">Hoja de Registro</p>
                <p className="text-xs text-sand/50">Formato de inscripcion MAQZONE</p>
              </div>
            </a>
            <a
              href="/docs/terminos-de-venta-maqzone.html"
              target="_blank"
              className="card flex items-center gap-3 transition hover:border-sand/30"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-ember/10">
                <svg className="h-5 w-5 text-ember" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-semibold text-sand">Terminos de Venta</p>
                <p className="text-xs text-sand/50">Condiciones de subasta</p>
              </div>
            </a>
          </div>
        </div>

        {/* Seguridad */}
        <div className="glass rounded-[24px] p-6 sm:rounded-[32px] sm:p-8">
          <h2 className="text-lg font-semibold text-sand">Seguridad</h2>
          <p className="mt-2 text-sm text-sand/60">
            Actualiza tu contrasena cuando lo necesites.
          </p>
          <button
            onClick={openPasswordModal}
            className="button-ghost mt-4 text-sm"
          >
            Cambiar contrasena
          </button>
        </div>

        <div className="text-center">
          <Link href="/" className="button-ghost inline-flex">
            Volver al inicio
          </Link>
        </div>
      </div>
    </section>
  );
}
