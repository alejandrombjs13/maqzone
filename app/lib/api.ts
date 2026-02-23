/* ── Centralized types + fetch helpers ─────────────── */

export const API_BASE =
  process.env.API_BASE ||
  process.env.NEXT_PUBLIC_API_BASE ||
  "http://localhost:8080";

export const WA_LINK = "https://wa.me/524442164550";

export type Listing = {
  id: number;
  title: string;
  description: string;
  location: string;
  price: number;
  sale_type: string;
  year: number;
  status: string;
  image_url: string;
};

export type Auction = {
  id: number;
  title: string;
  description: string;
  location: string;
  current_bid: number;
  reserve_price: number;
  status: string;
  end_time: string;
  image_url: string;
  start_time?: string;
  sale_mode?: string;
  fixed_price?: number;
  min_bid_increment?: number;
  buyer_premium_pct?: number;
  auto_extend_minutes?: number;
  auto_extend_window_minutes?: number;
  price_visible?: number;
  highest_bidder_id?: number;
};

export async function fetchListings(limit = 50): Promise<Listing[]> {
  try {
    const res = await fetch(`${API_BASE}/api/listings?limit=${limit}`, {
      next: { revalidate: 300 },
    });
    if (!res.ok) return [];
    return (await res.json()) as Listing[];
  } catch {
    return [];
  }
}

export async function fetchListing(id: string): Promise<Listing | null> {
  try {
    const res = await fetch(`${API_BASE}/api/listings/${id}`, {
      next: { revalidate: 300 },
    });
    if (!res.ok) return null;
    return (await res.json()) as Listing;
  } catch {
    return null;
  }
}

export async function fetchAuctions(limit = 20): Promise<Auction[]> {
  try {
    const res = await fetch(`${API_BASE}/api/auctions?limit=${limit}`, {
      next: { revalidate: 30 },
    });
    if (!res.ok) return [];
    return (await res.json()) as Auction[];
  } catch {
    return [];
  }
}

export function waMsg(text: string) {
  return `${WA_LINK}?text=${encodeURIComponent(text)}`;
}
