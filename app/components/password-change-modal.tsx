"use client";

import { useEffect, useRef, useState } from "react";

type Props = {
  open: boolean;
  forced?: boolean;
  onClose?: () => void;
  onSubmit: (currentPassword: string, newPassword: string) => Promise<void>;
};

export default function PasswordChangeModal({
  open,
  forced = false,
  onClose,
  onSubmit,
}: Props) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [nextPassword, setNextPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const firstInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    setCurrentPassword("");
    setNextPassword("");
    setConfirmPassword("");
    setError(null);
    setTimeout(() => firstInputRef.current?.focus(), 50);
  }, [open]);

  // Block Escape key when forced
  useEffect(() => {
    if (!open || !forced) return;
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") e.preventDefault(); };
    document.addEventListener("keydown", handler, true);
    return () => document.removeEventListener("keydown", handler, true);
  }, [open, forced]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!currentPassword || !nextPassword) {
      setError("Completa todos los campos.");
      return;
    }
    if (nextPassword.length < 8) {
      setError("La nueva contrasena debe tener al menos 8 caracteres.");
      return;
    }
    if (nextPassword !== confirmPassword) {
      setError("Las contrasenas no coinciden.");
      return;
    }

    setLoading(true);
    try {
      await onSubmit(currentPassword, nextPassword);
      if (!forced) {
        onClose?.();
      }
    } catch (err: any) {
      setError(err.message || "No se pudo cambiar la contrasena.");
    } finally {
      setLoading(false);
    }
  }

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[120] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={forced ? undefined : onClose}
    >
      <div className="glass w-full max-w-lg rounded-[24px] p-6 sm:rounded-[32px] sm:p-8" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-sand/50">
              Seguridad
            </p>
            <h2 className="mt-2 text-xl font-semibold text-sand sm:text-2xl">
              Cambiar contrasena
            </h2>
            {forced && (
              <p className="mt-2 text-sm text-sand/70">
                Por seguridad debes actualizar tu contrasena antes de continuar.
              </p>
            )}
          </div>
          {!forced && onClose && (
            <button
              onClick={onClose}
              className="rounded-full bg-sand/10 p-2 text-sand/70 transition hover:text-sand"
              aria-label="Cerrar"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label className="text-xs uppercase tracking-[0.3em] text-sand/60">
              Contrasena actual
            </label>
            <input
              ref={firstInputRef}
              type="password"
              className="mt-1 w-full rounded-xl border border-sand/20 bg-graphite/70 px-4 py-3 text-sand outline-none focus:border-cyan/50"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              autoComplete="current-password"
              required
            />
          </div>
          <div>
            <label className="text-xs uppercase tracking-[0.3em] text-sand/60">
              Nueva contrasena
            </label>
            <input
              type="password"
              className="mt-1 w-full rounded-xl border border-sand/20 bg-graphite/70 px-4 py-3 text-sand"
              value={nextPassword}
              onChange={(e) => setNextPassword(e.target.value)}
              autoComplete="new-password"
              required
            />
          </div>
          <div>
            <label className="text-xs uppercase tracking-[0.3em] text-sand/60">
              Confirmar contrasena
            </label>
            <input
              type="password"
              className="mt-1 w-full rounded-xl border border-sand/20 bg-graphite/70 px-4 py-3 text-sand"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              autoComplete="new-password"
              required
            />
          </div>

          {error && (
            <div className="rounded-xl bg-ember/10 px-3 py-2 text-sm text-ember">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="button-primary w-full text-base disabled:opacity-60"
          >
            {loading ? "Guardando..." : "Actualizar contrasena"}
          </button>
        </form>
      </div>
    </div>
  );
}
