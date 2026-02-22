"use client";

import { useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "../../components/auth-provider";

function LoginForm() {
  const { login } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") || "/auth/perfil";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(email, password);
      router.push(next);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error al iniciar sesion");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="section py-10 sm:py-16">
      <div className="mx-auto max-w-md">
        <div className="glass rounded-[24px] p-6 sm:rounded-[32px] sm:p-8">
          <h1 className="text-2xl font-semibold text-sand sm:text-3xl">
            Iniciar sesion
          </h1>
          <p className="mt-2 text-sm text-sand/60">
            Ingresa tus credenciales para acceder a la plataforma.
          </p>

          {error && (
            <div
              role="alert"
              aria-live="polite"
              className="mt-4 flex items-start gap-2 rounded-xl bg-ember/10 p-3"
            >
              <svg className="mt-0.5 h-4 w-4 shrink-0 text-ember" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-sm text-ember">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="mt-6 space-y-4" noValidate>
            <div>
              <label htmlFor="login-email" className="text-xs uppercase tracking-[0.3em] text-sand/60">
                Email
              </label>
              <input
                id="login-email"
                type="email"
                required
                autoComplete="email"
                className="mt-1 w-full rounded-xl border border-sand/20 bg-graphite/70 px-4 py-3 text-sand outline-none transition focus:border-cyan/50"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tu@empresa.com"
              />
            </div>

            <div>
              <label htmlFor="login-password" className="text-xs uppercase tracking-[0.3em] text-sand/60">
                Contrasena
              </label>
              <div className="relative mt-1">
                <input
                  id="login-password"
                  type={showPw ? "text" : "password"}
                  required
                  autoComplete="current-password"
                  className="w-full rounded-xl border border-sand/20 bg-graphite/70 px-4 py-3 pr-12 text-sand outline-none transition focus:border-cyan/50"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
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

            <button
              type="submit"
              disabled={loading}
              className="button-primary w-full min-h-[48px]"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Ingresando...
                </span>
              ) : "Ingresar"}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-sand/60">
            No tienes cuenta?{" "}
            <Link href="/auth/registro" className="text-cyan hover:underline">
              Registrate aqui
            </Link>
          </p>
        </div>
      </div>
    </section>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
