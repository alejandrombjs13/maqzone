"use client";

import Image from "next/image";
import { useState, useCallback, useEffect, useRef } from "react";

export default function ImageLightbox({
  images,
  alt,
}: {
  images: string[];
  alt: string;
}) {
  const [open, setOpen] = useState(false);
  const [current, setCurrent] = useState(0);
  const touchStartX = useRef<number | null>(null);

  const close = useCallback(() => setOpen(false), []);

  const prev = useCallback(
    () => setCurrent((c) => (c > 0 ? c - 1 : images.length - 1)),
    [images.length]
  );

  const next = useCallback(
    () => setCurrent((c) => (c < images.length - 1 ? c + 1 : 0)),
    [images.length]
  );

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") close();
      if (e.key === "ArrowLeft") prev();
      if (e.key === "ArrowRight") next();
    }
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, close, prev, next]);

  function openAt(idx: number) {
    setCurrent(idx);
    setOpen(true);
  }

  function handleTouchStart(e: React.TouchEvent) {
    touchStartX.current = e.touches[0].clientX;
  }

  function handleTouchEnd(e: React.TouchEvent) {
    if (touchStartX.current === null) return;
    const delta = e.changedTouches[0].clientX - touchStartX.current;
    touchStartX.current = null;
    if (Math.abs(delta) < 50) return; // ignore small swipes
    if (delta < 0) next();
    else prev();
  }

  return (
    <>
      {/* Main image */}
      <div className="space-y-4">
        <button
          onClick={() => openAt(0)}
          className="relative w-full overflow-hidden rounded-[24px] border border-sand/10 sm:rounded-[32px] cursor-zoom-in"
        >
          <Image
            src={images[0]}
            alt={alt}
            width={1200}
            height={720}
            className="h-64 w-full object-cover sm:h-[420px]"
          />
        </button>

        {/* Thumbnails — only show if multiple images */}
        {images.length > 1 && (
          <div className="grid grid-cols-4 gap-2 sm:grid-cols-5 sm:gap-3 md:grid-cols-6 lg:grid-cols-4">
            {images.slice(1).map((src, i) => (
              <button
                key={i}
                onClick={() => openAt(i + 1)}
                className="h-16 overflow-hidden rounded-xl border border-sand/10 bg-steel sm:h-20 cursor-zoom-in"
              >
                <Image
                  src={src}
                  alt={`${alt} vista ${i + 2}`}
                  width={400}
                  height={240}
                  className="h-full w-full object-cover opacity-60 transition hover:opacity-100"
                />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Lightbox overlay */}
      {open && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-sm"
          onClick={close}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
        >
          {/* Close */}
          <button
            onClick={close}
            className="absolute right-4 top-4 z-10 rounded-full bg-white/10 p-2 text-white transition hover:bg-white/20"
            aria-label="Cerrar"
          >
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          {/* Prev */}
          {images.length > 1 && (
            <button
              onClick={(e) => { e.stopPropagation(); prev(); }}
              className="absolute left-4 z-10 rounded-full bg-white/10 p-3 text-white transition hover:bg-white/20"
              aria-label="Anterior"
            >
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
            </button>
          )}

          {/* Image */}
          <div onClick={(e) => e.stopPropagation()} className="max-h-[85vh] max-w-[90vw]">
            <Image
              src={images[current]}
              alt={`${alt} ${current + 1}`}
              width={1600}
              height={1000}
              className="max-h-[85vh] w-auto rounded-2xl object-contain"
            />
          </div>

          {/* Next */}
          {images.length > 1 && (
            <button
              onClick={(e) => { e.stopPropagation(); next(); }}
              className="absolute right-4 z-10 rounded-full bg-white/10 p-3 text-white transition hover:bg-white/20"
              aria-label="Siguiente"
            >
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </button>
          )}

          {/* Counter */}
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full bg-white/10 px-4 py-1.5 text-sm text-white backdrop-blur">
            {current + 1} / {images.length}
          </div>
        </div>
      )}
    </>
  );
}
