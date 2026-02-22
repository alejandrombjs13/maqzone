"use client";

import { useState, useEffect } from "react";

function parseTimeLeft(endTime: string): number {
  const end = new Date(endTime).getTime();
  const now = Date.now();
  return Math.max(0, Math.floor((end - now) / 1000));
}

function formatDuration(seconds: number): string {
  if (seconds <= 0) return "00:00:00";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return [h, m, s].map((v) => String(v).padStart(2, "0")).join(":");
}

export default function CountdownTimer({
  endTime,
  onExpire,
}: {
  endTime: string;
  onExpire?: () => void;
}) {
  const [seconds, setSeconds] = useState(() => parseTimeLeft(endTime));

  useEffect(() => {
    setSeconds(parseTimeLeft(endTime));
    const interval = setInterval(() => {
      setSeconds((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          onExpire?.();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [endTime, onExpire]);

  const isExpired = seconds <= 0;
  const isUrgent = seconds > 0 && seconds < 300;

  return (
    <div className={`flex items-center gap-3 rounded-2xl border p-3 ${
      isExpired ? "border-sand/10 bg-graphite/60" : isUrgent ? "border-ember/30 bg-ember/5" : "border-sand/10 bg-graphite/60"
    }`}>
      <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${
        isExpired ? "bg-sand/10" : isUrgent ? "bg-ember/10" : "bg-cyan/10"
      }`}>
        <svg className={`h-5 w-5 ${isExpired ? "text-sand/50" : isUrgent ? "text-ember" : "text-cyan"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      </div>
      <div>
        <p className="text-[10px] uppercase tracking-[0.2em] text-sand/50">
          {isExpired ? "Subasta finalizada" : "Cierra en"}
        </p>
        <p className={`text-lg font-semibold tabular-nums ${
          isExpired ? "text-sand/50" : isUrgent ? "text-ember" : "text-sand"
        }`}>
          {isExpired ? "Cerrada" : formatDuration(seconds)}
        </p>
      </div>
    </div>
  );
}
