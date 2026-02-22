"use client";

import { useState, useEffect } from "react";
import { useAuth } from "./auth-provider";
import { useRouter } from "next/navigation";

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE ||
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  "http://localhost:8080";

type Props = {
  listingId: number;
};

export default function LikeButton({ listingId }: Props) {
  const { user, token } = useAuth();
  const router = useRouter();
  const [liked, setLiked] = useState(false);
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const t = localStorage.getItem("maqzone_token") || token;
    if (!t) {
      setReady(true);
      return;
    }
    fetch(`${API_BASE}/api/likes/check/${listingId}`, {
      headers: { Authorization: `Bearer ${t}` },
    })
      .then((r) => r.json())
      .then((d) => setLiked(Boolean(d.liked)))
      .catch(() => {})
      .finally(() => setReady(true));
  }, [listingId, token]);

  async function toggle() {
    if (!user) {
      router.push(`/auth/login?next=/productos/${listingId}`);
      return;
    }
    if (loading) return;
    setLoading(true);
    const t = localStorage.getItem("maqzone_token") || token;
    try {
      const res = await fetch(`${API_BASE}/api/likes/${listingId}`, {
        method: liked ? "DELETE" : "POST",
        headers: { Authorization: `Bearer ${t}` },
      });
      if (res.ok) setLiked(!liked);
    } catch {}
    setLoading(false);
  }

  return (
    <button
      onClick={toggle}
      disabled={loading || !ready}
      title={liked ? "Quitar de favoritos" : "Guardar en favoritos"}
      className={`flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-medium transition disabled:opacity-40
        ${liked
          ? "border-ember/40 bg-ember/10 text-ember hover:bg-ember/20"
          : "border-sand/20 bg-graphite/60 text-sand/70 hover:border-sand/40 hover:text-sand"
        }`}
    >
      <svg
        className={`h-5 w-5 transition-transform ${liked ? "scale-110" : ""}`}
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
        fill={liked ? "currentColor" : "none"}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
        />
      </svg>
      {liked ? "Guardado" : "Guardar"}
    </button>
  );
}
