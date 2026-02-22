"use client";

import { useState, useEffect, useCallback } from "react";

export type Slide = {
  type: "video" | "image";
  src: string;
  poster?: string;
  alt?: string;
};

export default function HeroCarousel({ slides }: { slides: Slide[] }) {
  const [current, setCurrent] = useState(0);
  const [paused, setPaused] = useState(false);

  const next = useCallback(
    () => setCurrent((c) => (c + 1) % slides.length),
    [slides.length]
  );

  const prev = useCallback(
    () => setCurrent((c) => (c - 1 + slides.length) % slides.length),
    [slides.length]
  );

  useEffect(() => {
    if (paused) return;
    const id = setInterval(next, 6000);
    return () => clearInterval(id);
  }, [paused, next]);

  return (
    <div
      className="relative w-full overflow-hidden rounded-[24px] sm:rounded-[32px]"
      style={{ height: "clamp(320px, 55vh, 600px)" }}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      {/* Slides */}
      {slides.map((slide, i) => (
        <div
          key={i}
          className={`absolute inset-0 transition-opacity duration-700 ease-in-out ${
            i === current ? "opacity-100 z-10" : "opacity-0 z-0"
          }`}
        >
          {slide.type === "video" ? (
            <video
              autoPlay
              muted
              loop
              playsInline
              poster={slide.poster}
              preload={i === current ? "auto" : "none"}
              className="h-full w-full object-cover"
            >
              <source src={slide.src} type="video/mp4" />
            </video>
          ) : (
            <img
              src={slide.src}
              alt={slide.alt || ""}
              className="h-full w-full object-cover"
            />
          )}
        </div>
      ))}

      {/* Gradient overlay */}
      <div className="absolute inset-0 z-20 bg-gradient-to-b from-graphite/60 via-graphite/20 to-graphite/80" />

      {/* Slogan */}
      <div className="absolute inset-0 z-30 flex items-center justify-center px-6">
        <h2 className="slogan-text text-center font-display text-4xl uppercase tracking-[0.1em] text-sand sm:text-6xl lg:text-8xl">
          Subastas de maquinaria
          <br />
          <span className="text-cyan">sin fronteras</span>
        </h2>
      </div>

      {/* Prev / Next */}
      <button
        onClick={prev}
        aria-label="Anterior"
        className="absolute left-3 top-1/2 z-40 -translate-y-1/2 rounded-full border border-sand/10 bg-graphite/50 p-2 text-sand/70 backdrop-blur transition hover:text-sand sm:left-5 sm:p-3"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-5 w-5 sm:h-6 sm:w-6"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
        </svg>
      </button>
      <button
        onClick={next}
        aria-label="Siguiente"
        className="absolute right-3 top-1/2 z-40 -translate-y-1/2 rounded-full border border-sand/10 bg-graphite/50 p-2 text-sand/70 backdrop-blur transition hover:text-sand sm:right-5 sm:p-3"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-5 w-5 sm:h-6 sm:w-6"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
        </svg>
      </button>

      {/* Dot indicators */}
      <div className="absolute bottom-5 left-1/2 z-40 flex -translate-x-1/2 gap-2">
        {slides.map((_, i) => (
          <button
            key={i}
            onClick={() => setCurrent(i)}
            aria-label={`Ir a slide ${i + 1}`}
            className={`h-2 rounded-full transition-all duration-300 ${
              i === current ? "w-8 bg-ember" : "w-2 bg-sand/40"
            }`}
          />
        ))}
      </div>
    </div>
  );
}
