"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "./auth-provider";
import { useAuctionWS } from "../hooks/use-auction-ws";
import CountdownTimer from "./countdown-timer";
import Link from "next/link";
import { useRouter } from "next/navigation";

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE ||
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  "http://localhost:8080";

type BidEntry = { amount: number; created_at: string };
type EnrollmentStatus = "none" | "pending" | "approved" | "rejected" | "loading";

type Props = {
  auctionId: number;
  currentBid: number;
  reservePrice: number;
  endTime: string;
  status: string;
  minBidIncrement?: number;
  priceVisible?: number;
  buyerPremiumPct?: number;
};

export default function LiveBidPanel({
  auctionId,
  currentBid: initialBid,
  reservePrice,
  endTime: initialEndTime,
  status,
  minBidIncrement = 1000,
  priceVisible = 1,
  buyerPremiumPct = 14,
}: Props) {
  const { user, token, openPasswordModal } = useAuth();
  const { connected, lastMessage } = useAuctionWS(auctionId);
  const router = useRouter();

  const [currentBid, setCurrentBid] = useState(initialBid);
  const [endTime, setEndTime] = useState(initialEndTime);
  const [bidAmount, setBidAmount] = useState("");
  const [bids, setBids] = useState<BidEntry[]>([]);
  const [bidding, setBidding] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [notification, setNotification] = useState<string | null>(null);
  const [enrollmentStatus, setEnrollmentStatus] = useState<EnrollmentStatus>("loading");
  const [enrolling, setEnrolling] = useState(false);
  const [extended, setExtended] = useState(false);
  const [expired, setExpired] = useState(false);

  const isBlindBid = priceVisible === 0;

  // Load bid history
  useEffect(() => {
    fetch(`${API_BASE}/api/auctions/${auctionId}/bids`)
      .then((r) => r.json())
      .then((data) => { if (Array.isArray(data)) setBids(data); })
      .catch(() => {});
  }, [auctionId]);

  // Check enrollment status
  const checkEnrollment = useCallback(async () => {
    if (!token || !user) { setEnrollmentStatus("none"); return; }
    try {
      const res = await fetch(`${API_BASE}/api/auctions/${auctionId}/enroll`, {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      });
      if (res.status === 404) { setEnrollmentStatus("none"); return; }
      if (!res.ok) { setEnrollmentStatus("none"); return; }
      const data = await res.json();
      setEnrollmentStatus(data.status as EnrollmentStatus);
    } catch {
      setEnrollmentStatus("none");
    }
  }, [auctionId, token, user]);

  useEffect(() => {
    if (user && token) void checkEnrollment();
    else if (!user) setEnrollmentStatus("none");
  }, [user, token, checkEnrollment]);

  // Handle WS messages
  useEffect(() => {
    if (!lastMessage) return;
    if (lastMessage.type === "bid") {
      setCurrentBid(lastMessage.amount);
      setBids((prev) => [{ amount: lastMessage.amount, created_at: lastMessage.timestamp }, ...prev]);
      // Auto-extend notification
      if (lastMessage.end_time && lastMessage.end_time !== endTime) {
        setEndTime(lastMessage.end_time);
        setExpired(false); // time was extended, re-enable form
        setExtended(true);
        setTimeout(() => setExtended(false), 5000);
      }
    }
    if (lastMessage.type === "outbid" && user) {
      // Only notify if this message targets the current user
      setNotification("Fuiste superado. Alguien hizo una puja mayor.");
      setTimeout(() => setNotification(null), 8000);
    }
  }, [lastMessage, endTime, user]);

  async function handleEnroll() {
    if (!token) return;
    setEnrolling(true);
    try {
      const res = await fetch(`${API_BASE}/api/auctions/${auctionId}/enroll`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.status === 409) { setEnrollmentStatus("pending"); return; }
      if (!res.ok) { const d = await res.json(); throw new Error(d.error || "Error"); }
      setEnrollmentStatus("pending");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error al inscribirse");
    } finally {
      setEnrolling(false);
    }
  }

  const progress = reservePrice > 0 ? Math.min(100, Math.round((currentBid / reservePrice) * 100)) : 0;
  const minBid = currentBid + minBidIncrement;

  async function handleBid(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (user?.must_change_password) {
      openPasswordModal();
      return;
    }

    const amount = parseInt(bidAmount, 10);
    if (isNaN(amount) || amount < minBid) {
      setError(`La puja minima es $${minBid.toLocaleString("es-MX")} MXN`);
      return;
    }

    setBidding(true);
    try {
      const res = await fetch(`${API_BASE}/api/auctions/${auctionId}/bids`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ amount }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error al pujar");
      setSuccess("Puja registrada exitosamente");
      setBidAmount("");
      setTimeout(() => setSuccess(""), 4000);
      // Update end_time if server extended it
      if (data.end_time && data.end_time !== endTime) {
        setEndTime(data.end_time);
        setExtended(true);
        setTimeout(() => setExtended(false), 5000);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error al pujar");
    } finally {
      setBidding(false);
    }
  }

  // --- Render helpers ---

  function renderEnrollmentBlock() {
    if (!user) {
      return (
        <div className="rounded-xl bg-sand/5 p-4 text-center">
          <p className="text-sm text-sand/60">Inicia sesion para solicitar acceso a esta subasta.</p>
          <Link href="/auth/login" className="button-primary mt-3 inline-flex text-sm">Iniciar sesion</Link>
        </div>
      );
    }
    if (user.must_change_password) {
      return (
        <div className="rounded-xl border border-yellow-500/30 bg-yellow-500/10 p-4 text-center">
          <p className="text-sm font-medium text-yellow-400">Actualiza tu contrasena primero</p>
          <p className="mt-1 text-xs text-sand/60">Por seguridad debes cambiar tu contrasena antes de participar.</p>
          <button
            className="button-primary mt-3 text-sm"
            onClick={() => { openPasswordModal(); }}
          >
            Cambiar contrasena
          </button>
        </div>
      );
    }
    if (user.status === "pending") {
      return (
        <div className="rounded-xl bg-yellow-500/10 p-4 text-center">
          <p className="text-sm text-sand/60">Tu cuenta esta pendiente de aprobacion.</p>
          <Link href="/auth/perfil" className="text-cyan text-sm hover:underline mt-1 inline-block">Ver estado de tu cuenta</Link>
        </div>
      );
    }
    if (user.status === "rejected") {
      return (
        <div className="rounded-xl bg-ember/10 p-4 text-center text-sm text-sand/60">
          Tu cuenta fue rechazada. Contacta a soporte.
        </div>
      );
    }
    if (enrollmentStatus === "loading") {
      return <div className="text-xs text-sand/40 text-center">Verificando acceso...</div>;
    }
    if (enrollmentStatus === "none") {
      return (
        <div className="rounded-xl border border-cyan/20 bg-cyan/5 p-4 text-center">
          <p className="text-sm text-sand/70">Solicita acceso para participar en esta subasta.</p>
          <button
            className="button-primary mt-3 text-sm"
            onClick={handleEnroll}
            disabled={enrolling}
          >
            {enrolling ? "Enviando solicitud..." : "Solicitar acceso"}
          </button>
        </div>
      );
    }
    if (enrollmentStatus === "pending") {
      return (
        <div className="rounded-xl bg-yellow-500/10 p-4 text-center">
          <p className="text-sm font-medium text-yellow-400">Solicitud pendiente de aprobacion</p>
          <p className="text-xs text-sand/50 mt-1">El administrador revisara tu inscripcion.</p>
        </div>
      );
    }
    if (enrollmentStatus === "rejected") {
      return (
        <div className="rounded-xl bg-ember/10 p-4 text-center text-sm text-ember">
          Tu inscripcion fue rechazada. Contacta a soporte.
        </div>
      );
    }
    // approved — show bid form
    return null;
  }

  const enrollBlock = renderEnrollmentBlock();

  return (
    <div className="glass rounded-[20px] p-5 sm:p-6 space-y-4">
      {/* Connection indicator */}
      <div className="flex items-center justify-between">
        <span className="text-xs text-sand/50">Pujas en vivo</span>
        <span className={`flex items-center gap-1.5 text-xs ${connected ? "text-cyan" : "text-sand/40"}`}>
          <span className={`h-2 w-2 rounded-full ${connected ? "bg-cyan animate-pulse" : "bg-sand/30"}`} />
          {connected ? "Conectado" : "Reconectando..."}
        </span>
      </div>

      {/* Outbid notification */}
      {notification && (
        <div className="rounded-xl bg-ember/10 border border-ember/20 px-4 py-3 flex items-center gap-3">
          <svg className="h-4 w-4 text-ember shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
          </svg>
          <p className="text-sm text-ember">{notification}</p>
        </div>
      )}

      {/* Auto-extend notification */}
      {extended && (
        <div className="rounded-xl bg-cyan/10 border border-cyan/20 px-4 py-2 text-xs text-cyan text-center animate-pulse">
          Tiempo extendido — nueva puja en los ultimos momentos
        </div>
      )}

      {/* Current bid */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <p className="text-[10px] uppercase tracking-[0.2em] text-sand/50 sm:text-xs">Puja actual</p>
          {isBlindBid ? (
            <div className="flex items-center gap-2">
              <p className="text-2xl font-semibold text-ember/60 sm:text-3xl">—</p>
              <span className="rounded-full bg-sand/10 px-2 py-0.5 text-[10px] text-sand/50">oculto</span>
            </div>
          ) : (
            <p className="text-2xl font-semibold text-ember sm:text-3xl">${currentBid.toLocaleString("es-MX")}</p>
          )}
          <p className="text-xs text-sand/40">MXN</p>
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-[0.2em] text-sand/50 sm:text-xs">Precio reserva</p>
          <p className="text-2xl font-semibold text-sand sm:text-3xl">${reservePrice.toLocaleString("es-MX")}</p>
          <p className="text-xs text-sand/40">MXN</p>
        </div>
      </div>

      {/* Progress (only if price visible) */}
      {!isBlindBid && (
        <div>
          <div className="flex justify-between text-xs text-sand/50">
            <span>Progreso hacia reserva</span>
            <span className="font-semibold text-sand/70">{progress}%</span>
          </div>
          <div className="mt-1.5 h-2.5 overflow-hidden rounded-full bg-graphite">
            <div className="h-full rounded-full bg-gradient-to-r from-ember to-cyan transition-all" style={{ width: `${progress}%` }} />
          </div>
        </div>
      )}

      {/* Auction config info */}
      <div className="flex flex-wrap gap-3 text-xs text-sand/40">
        <span>Incremento min: ${minBidIncrement.toLocaleString("es-MX")} MXN</span>
        <span>Prima comprador: {buyerPremiumPct}%</span>
        {isBlindBid && <span className="text-sand/60 font-medium">Subasta ciega</span>}
      </div>

      {/* Countdown */}
      <CountdownTimer endTime={endTime} onExpire={() => setExpired(true)} />

      {/* Bid form or status */}
      {status !== "active" || expired ? (
        <div className="rounded-xl bg-sand/5 p-4 text-center text-sm text-sand/60">
          {expired ? "El tiempo de esta subasta ha terminado." : "Esta subasta no esta activa."}
        </div>
      ) : enrollBlock !== null ? (
        enrollBlock
      ) : (
        <form onSubmit={handleBid} className="space-y-3">
          <div>
            <label className="text-xs text-sand/50">
              {isBlindBid
                ? `Monto de tu puja (incrementos de $${minBidIncrement.toLocaleString("es-MX")})`
                : `Monto (min. $${minBid.toLocaleString("es-MX")} MXN)`}
            </label>
            <input
              type="number"
              min={isBlindBid ? minBidIncrement : minBid}
              step={minBidIncrement}
              required
              className="mt-1 w-full rounded-xl border border-sand/20 bg-graphite/70 px-4 py-3 text-sand tabular-nums"
              value={bidAmount}
              onChange={(e) => setBidAmount(e.target.value)}
              placeholder={(isBlindBid ? minBidIncrement : minBid).toLocaleString("es-MX")}
            />
            {isBlindBid && (
              <p className="mt-1 text-xs text-sand/40">El precio actual no es visible. Tu puja es confidencial.</p>
            )}
          </div>
          {error && <p className="text-sm text-ember">{error}</p>}
          {success && <p className="text-sm text-cyan">{success}</p>}
          <button type="submit" disabled={bidding} className="button-primary w-full text-base">
            {bidding ? "Registrando puja..." : "Pujar ahora"}
          </button>
          <p className="text-xs text-sand/30 text-center">
            Prima del comprador: {buyerPremiumPct}% + IVA se aplicara al precio final.
          </p>
        </form>
      )}

      {/* Anonymous bid history (only if price visible) */}
      {bids.length > 0 && !isBlindBid && (
        <div className="space-y-2">
          <p className="text-xs uppercase tracking-wider text-sand/50">Historial de pujas</p>
          <div className="max-h-40 overflow-y-auto space-y-1.5">
            {bids.slice(0, 10).map((b, i) => (
              <div key={i} className="flex items-center justify-between rounded-lg bg-graphite/40 px-3 py-2">
                <span className="text-sm font-semibold text-sand tabular-nums">${b.amount.toLocaleString("es-MX")}</span>
                <span className="text-xs text-sand/40">{new Date(b.created_at).toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" })}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Bid count (always visible) */}
      {bids.length > 0 && isBlindBid && (
        <p className="text-xs text-sand/40 text-center">{bids.length} puja{bids.length !== 1 ? "s" : ""} registrada{bids.length !== 1 ? "s" : ""}</p>
      )}
    </div>
  );
}
