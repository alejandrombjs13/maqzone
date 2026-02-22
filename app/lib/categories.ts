/* ── Single source of truth for product categories ── */

export type Category = {
  name: string;
  slug: string;
  keywords: string[];
  icon: string; // SVG path d
};

export const categories: Category[] = [
  {
    name: "Tornos CNC",
    slug: "tornos-cnc",
    keywords: ["torno", "sl-", "sl20", "sl30", "lathe", "cnc"],
    icon: "M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z",
  },
  {
    name: "Centros de maquinado",
    slug: "centros-de-maquinado",
    keywords: ["centro", "maquinado", "vf-", "vf0", "mill", "vertical", "doosan"],
    icon: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2",
  },
  {
    name: "Rectificadoras",
    slug: "rectificadoras",
    keywords: ["rectificadora", "rectificado", "grinder", "goodwill", "gc-"],
    icon: "M13 10V3L4 14h7v7l9-11h-7z",
  },
  {
    name: "Transporte pesado",
    slug: "transporte-pesado",
    keywords: ["freightliner", "cascadia", "camion", "truck", "m2", "transporte", "refrigerada"],
    icon: "M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4",
  },
];

export function matchCategory(title: string, description: string): string | null {
  const text = `${title} ${description}`.toLowerCase();
  for (const cat of categories) {
    if (cat.keywords.some((kw) => text.includes(kw))) {
      return cat.slug;
    }
  }
  return null;
}

export function getCategoryBySlug(slug: string): Category | undefined {
  return categories.find((c) => c.slug === slug);
}
