import { NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";

const API_BASE =
  process.env.API_BASE ||
  process.env.NEXT_PUBLIC_API_BASE ||
  "http://localhost:8080";

function isImageFile(name: string) {
  return /\.(png|jpg|jpeg|webp)$/i.test(name);
}

function sortImageNames(a: string, b: string) {
  const na = parseInt(a, 10);
  const nb = parseInt(b, 10);
  if (!Number.isNaN(na) && !Number.isNaN(nb)) {
    return na - nb;
  }
  return a.localeCompare(b);
}

async function requireAdmin(req: Request) {
  const auth = req.headers.get("authorization");
  if (!auth || !auth.startsWith("Bearer ")) return false;
  const res = await fetch(`${API_BASE}/api/auth/me`, {
    headers: { Authorization: auth },
    cache: "no-store",
  });
  if (!res.ok) return false;
  const user = await res.json();
  return Boolean(user?.is_admin);
}

function normalizeSlug(value: string) {
  if (!value) return "";
  const clean = value.replace(/[^a-zA-Z0-9-_]/g, "");
  return clean;
}

export async function GET(req: Request) {
  const ok = await requireAdmin(req);
  if (!ok) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const productsDir = path.join(process.cwd(), "public", "products");
  const entries = await fs.readdir(productsDir, { withFileTypes: true });
  const products = [];

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const slug = entry.name;
    const dir = path.join(productsDir, slug);
    const files = await fs.readdir(dir);
    const images = files
      .filter(isImageFile)
      .sort(sortImageNames)
      .map((name) => ({
        name,
        url: `/products/${slug}/${name}`,
      }));
    products.push({ slug, images });
  }

  products.sort((a, b) => a.slug.localeCompare(b.slug));

  return NextResponse.json({ products });
}

export async function POST(req: Request) {
  const ok = await requireAdmin(req);
  if (!ok) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const slug = normalizeSlug(body.slug || "");
  const order = Array.isArray(body.order) ? body.order : [];
  if (!slug || order.length === 0) {
    return NextResponse.json({ error: "invalid payload" }, { status: 400 });
  }

  const productsDir = path.join(process.cwd(), "public", "products");
  const dir = path.join(productsDir, slug);
  const files = await fs.readdir(dir);
  const images = files.filter(isImageFile);
  const available = new Set(images);
  const normalized = order.map((name: string) => path.basename(name));

  if (normalized.length !== images.length) {
    return NextResponse.json({ error: "order length mismatch" }, { status: 400 });
  }
  for (const name of normalized) {
    if (!available.has(name)) {
      return NextResponse.json({ error: "invalid file in order" }, { status: 400 });
    }
  }

  const tempNames: string[] = [];
  const exts: string[] = [];

  for (let i = 0; i < normalized.length; i += 1) {
    const name = normalized[i];
    const ext = path.extname(name) || ".png";
    const tmp = `.tmp-${i}${ext}`;
    await fs.rename(path.join(dir, name), path.join(dir, tmp));
    tempNames.push(tmp);
    exts.push(ext);
  }

  for (let i = 0; i < tempNames.length; i += 1) {
    const finalName = `${i + 1}${exts[i]}`;
    await fs.rename(path.join(dir, tempNames[i]), path.join(dir, finalName));
  }

  return NextResponse.json({ ok: true });
}
