"use client";

export type Logo = { name: string; initial: string };

export default function ClientLogos({ logos }: { logos: Logo[] }) {
  return (
    <div
      className="overflow-hidden"
      onMouseEnter={(e) => {
        const el = e.currentTarget.firstElementChild as HTMLElement;
        if (el) el.style.animationPlayState = "paused";
      }}
      onMouseLeave={(e) => {
        const el = e.currentTarget.firstElementChild as HTMLElement;
        if (el) el.style.animationPlayState = "running";
      }}
    >
      <div
        className="flex animate-scroll gap-10 sm:gap-14"
        style={{ willChange: "transform" }}
      >
        {[...logos, ...logos].map((logo, i) => (
          <div
            key={i}
            className="flex shrink-0 items-center gap-3 opacity-50 transition duration-300 hover:opacity-100"
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-sand/20 bg-steel text-lg font-bold text-cyan sm:h-12 sm:w-12 sm:text-xl">
              {logo.initial}
            </span>
            <span className="whitespace-nowrap text-sm font-semibold text-sand/60 sm:text-base">
              {logo.name}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
