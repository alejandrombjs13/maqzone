"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth, type RegisterData } from "../../components/auth-provider";
import { WA_LINK } from "../../lib/api";

export default function RegistroPage() {
  const { register } = useAuth();
  const router = useRouter();
  const [step, setStep] = useState<"form" | "confirmation">("form");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPw, setShowPw] = useState(false);
  const [form, setForm] = useState<RegisterData>({
    email: "",
    password: "",
    business_name: "",
    legal_representative: "",
    rfc: "",
    street_address: "",
    colony: "",
    municipality: "",
    postal_code: "",
    city: "",
    state: "",
    phone: "",
    mobile: "",
  });

  function update(key: keyof RegisterData, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await register(form);
      setStep("confirmation");
    } catch (err: any) {
      setError(err.message || "Error al registrarse");
    } finally {
      setLoading(false);
    }
  }

  const waTemplate = encodeURIComponent(
    `Hola MAQZONE, acabo de registrarme en la plataforma con el email ${form.email}. Adjunto mis documentos para completar el proceso de verificacion.`
  );

  if (step === "confirmation") {
    return (
      <section className="section py-10 sm:py-16">
        <div className="mx-auto max-w-2xl">
          <div className="glass rounded-[24px] p-6 sm:rounded-[32px] sm:p-8">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-cyan/10">
                <svg className="h-8 w-8 text-cyan" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h1 className="mt-4 text-2xl font-semibold text-sand sm:text-3xl">
                Registro completado
              </h1>
              <p className="mt-3 text-sm text-sand/70 sm:text-base">
                Tu cuenta ha sido creada con exito. Para activar tu participacion
                en subastas, envia los siguientes documentos por WhatsApp:
              </p>

              <div className="mt-6 space-y-3">
                <h3 className="text-sm font-semibold uppercase tracking-wider text-sand/80">
                  Persona Fisica
                </h3>
                <ul className="space-y-2 text-sm text-sand/70">
                  <li className="flex items-start gap-2">
                    <span className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-cyan" />
                    Copia de identificacion oficial vigente (INE/IFE)
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-cyan" />
                    Constancia de Situacion Fiscal 2025
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-cyan" />
                    Comprobante de domicilio (no mayor a 3 meses)
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-cyan" />
                    Estado de cuenta bancario con CLABE
                  </li>
                </ul>
              </div>

              <div className="mt-6 space-y-3">
                <h3 className="text-sm font-semibold uppercase tracking-wider text-sand/80">
                  Persona Moral (adicional)
                </h3>
                <ul className="space-y-2 text-sm text-sand/70">
                  <li className="flex items-start gap-2">
                    <span className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-cyan" />
                    Acta Constitutiva
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-cyan" />
                    Poder Notarial del representante legal
                  </li>
                </ul>
              </div>

              <div className="mt-8 space-y-3">
                <a
                  href={`${WA_LINK}?text=${waTemplate}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="button-primary w-full min-h-[48px] text-base"
                >
                  Enviar documentos por WhatsApp
                </a>

                <div className="grid grid-cols-2 gap-3">
                  <a
                    href="/docs/hoja-de-registro-maqzone.html"
                    target="_blank"
                    className="button-ghost text-xs sm:text-sm"
                  >
                    Descargar Hoja de Registro
                  </a>
                  <a
                    href="/docs/terminos-de-venta-maqzone.html"
                    target="_blank"
                    className="button-ghost text-xs sm:text-sm"
                  >
                    Ver Terminos de Venta
                  </a>
                </div>

                <Link
                  href="/auth/perfil"
                  className="button-ghost w-full text-center block"
                >
                  Ir a mi perfil
                </Link>
              </div>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="section py-10 sm:py-16">
      <div className="mx-auto max-w-2xl">
        <div className="glass rounded-[24px] p-6 sm:rounded-[32px] sm:p-8">
            <h1 className="text-2xl font-semibold text-sand sm:text-3xl">
              Crear cuenta
            </h1>
            <p className="mt-2 text-sm text-sand/60">
              Registrate para participar en subastas y comprar equipos verificados.
            </p>

            {error && (
              <div className="mt-4 flex items-start gap-2 rounded-xl bg-ember/10 p-3">
                <svg className="mt-0.5 h-4 w-4 shrink-0 text-ember" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-sm text-ember">{error}</p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="mt-6 space-y-4">
              {/* Email & Password */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="reg-email" className="text-xs uppercase tracking-[0.3em] text-sand/60">
                    Email *
                  </label>
                  <input
                    id="reg-email"
                    type="email"
                    required
                    autoComplete="email"
                    className="mt-1 w-full rounded-xl border border-sand/20 bg-graphite/70 px-4 py-3 text-sand"
                    value={form.email}
                    onChange={(e) => update("email", e.target.value)}
                    placeholder="tu@empresa.com"
                  />
                </div>
                <div>
                  <label htmlFor="reg-password" className="text-xs uppercase tracking-[0.3em] text-sand/60">
                    Contrasena *
                  </label>
                  <div className="relative mt-1">
                    <input
                      id="reg-password"
                      type={showPw ? "text" : "password"}
                      required
                      minLength={8}
                      autoComplete="new-password"
                      className="w-full rounded-xl border border-sand/20 bg-graphite/70 px-4 py-3 pr-12 text-sand"
                      value={form.password}
                      onChange={(e) => update("password", e.target.value)}
                      placeholder="Min. 8 caracteres"
                    />
                    <button
                      type="button"
                      className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-sand/40 transition hover:text-sand"
                      onClick={() => setShowPw(!showPw)}
                      aria-label={showPw ? "Ocultar contrasena" : "Mostrar contrasena"}
                    >
                      {showPw ? (
                        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
                        </svg>
                      ) : (
                        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                      )}
                    </button>
                  </div>
                </div>
              </div>

              {/* Business name & Legal rep */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="reg-business" className="text-xs uppercase tracking-[0.3em] text-sand/60">
                    Nombre / Razon Social
                  </label>
                  <input
                    id="reg-business"
                    autoComplete="organization"
                    className="mt-1 w-full rounded-xl border border-sand/20 bg-graphite/70 px-4 py-3 text-sand"
                    value={form.business_name}
                    onChange={(e) => update("business_name", e.target.value)}
                    placeholder="Mi Empresa S.A. de C.V."
                  />
                </div>
                <div>
                  <label htmlFor="reg-legal-rep" className="text-xs uppercase tracking-[0.3em] text-sand/60">
                    Representante Legal
                  </label>
                  <input
                    id="reg-legal-rep"
                    autoComplete="name"
                    className="mt-1 w-full rounded-xl border border-sand/20 bg-graphite/70 px-4 py-3 text-sand"
                    value={form.legal_representative}
                    onChange={(e) => update("legal_representative", e.target.value)}
                    placeholder="Nombre completo"
                  />
                </div>
              </div>

              {/* RFC */}
              <div>
                <label htmlFor="reg-rfc" className="text-xs uppercase tracking-[0.3em] text-sand/60">
                  RFC
                </label>
                <input
                  id="reg-rfc"
                  className="mt-1 w-full rounded-xl border border-sand/20 bg-graphite/70 px-4 py-3 text-sand"
                  value={form.rfc}
                  onChange={(e) => update("rfc", e.target.value.toUpperCase())}
                  placeholder="XAXX010101000"
                  maxLength={13}
                />
              </div>

              {/* Street */}
              <div>
                <label htmlFor="reg-street" className="text-xs uppercase tracking-[0.3em] text-sand/60">
                  Calle y numero
                </label>
                <input
                  id="reg-street"
                  autoComplete="street-address"
                  className="mt-1 w-full rounded-xl border border-sand/20 bg-graphite/70 px-4 py-3 text-sand"
                  value={form.street_address}
                  onChange={(e) => update("street_address", e.target.value)}
                  placeholder="Av. Industrias 1234"
                />
              </div>

              {/* Colony, Municipality, CP */}
              <div className="grid gap-4 sm:grid-cols-3">
                <div>
                  <label htmlFor="reg-colony" className="text-xs uppercase tracking-[0.3em] text-sand/60">
                    Colonia
                  </label>
                  <input
                    id="reg-colony"
                    className="mt-1 w-full rounded-xl border border-sand/20 bg-graphite/70 px-4 py-3 text-sand"
                    value={form.colony}
                    onChange={(e) => update("colony", e.target.value)}
                    placeholder="Centro"
                  />
                </div>
                <div>
                  <label htmlFor="reg-municipality" className="text-xs uppercase tracking-[0.3em] text-sand/60">
                    Municipio
                  </label>
                  <input
                    id="reg-municipality"
                    className="mt-1 w-full rounded-xl border border-sand/20 bg-graphite/70 px-4 py-3 text-sand"
                    value={form.municipality}
                    onChange={(e) => update("municipality", e.target.value)}
                    placeholder="San Luis Potosi"
                  />
                </div>
                <div>
                  <label htmlFor="reg-cp" className="text-xs uppercase tracking-[0.3em] text-sand/60">
                    C.P.
                  </label>
                  <input
                    id="reg-cp"
                    autoComplete="postal-code"
                    inputMode="numeric"
                    className="mt-1 w-full rounded-xl border border-sand/20 bg-graphite/70 px-4 py-3 text-sand"
                    value={form.postal_code}
                    onChange={(e) => update("postal_code", e.target.value)}
                    placeholder="78000"
                    maxLength={5}
                  />
                </div>
              </div>

              {/* City & State */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="reg-city" className="text-xs uppercase tracking-[0.3em] text-sand/60">
                    Ciudad
                  </label>
                  <input
                    id="reg-city"
                    autoComplete="address-level2"
                    className="mt-1 w-full rounded-xl border border-sand/20 bg-graphite/70 px-4 py-3 text-sand"
                    value={form.city}
                    onChange={(e) => update("city", e.target.value)}
                    placeholder="San Luis Potosi"
                  />
                </div>
                <div>
                  <label htmlFor="reg-state" className="text-xs uppercase tracking-[0.3em] text-sand/60">
                    Estado
                  </label>
                  <input
                    id="reg-state"
                    autoComplete="address-level1"
                    className="mt-1 w-full rounded-xl border border-sand/20 bg-graphite/70 px-4 py-3 text-sand"
                    value={form.state}
                    onChange={(e) => update("state", e.target.value)}
                    placeholder="S.L.P."
                  />
                </div>
              </div>

              {/* Phone & Mobile */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="reg-phone" className="text-xs uppercase tracking-[0.3em] text-sand/60">
                    Telefono
                  </label>
                  <input
                    id="reg-phone"
                    type="tel"
                    autoComplete="tel"
                    inputMode="tel"
                    className="mt-1 w-full rounded-xl border border-sand/20 bg-graphite/70 px-4 py-3 text-sand"
                    value={form.phone}
                    onChange={(e) => update("phone", e.target.value)}
                    placeholder="444 123 4567"
                  />
                </div>
                <div>
                  <label htmlFor="reg-mobile" className="text-xs uppercase tracking-[0.3em] text-sand/60">
                    Celular
                  </label>
                  <input
                    id="reg-mobile"
                    type="tel"
                    autoComplete="tel"
                    inputMode="tel"
                    className="mt-1 w-full rounded-xl border border-sand/20 bg-graphite/70 px-4 py-3 text-sand"
                    value={form.mobile}
                    onChange={(e) => update("mobile", e.target.value)}
                    placeholder="444 987 6543"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="button-primary w-full min-h-[48px]"
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Registrando...
                  </span>
                ) : "Crear cuenta"}
              </button>
            </form>

            <p className="mt-6 text-center text-sm text-sand/60">
              Ya tienes cuenta?{" "}
              <Link href="/auth/login" className="text-cyan hover:underline">
                Inicia sesion
              </Link>
            </p>
        </div>
      </div>
    </section>
  );
}
