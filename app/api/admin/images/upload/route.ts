import { NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";

const API_BASE =
  process.env.API_BASE ||
  process.env.NEXT_PUBLIC_API_BASE ||
  "http://localhost:8080";

const ALLOWED_EXTS = new Set([".jpg", ".jpeg", ".png", ".webp"]);
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB
const MAX_FILES = 20;

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
  return value.replace(/[^a-z0-9-_]/g, "");
}

function isImageFile(name: string) {
  return /\.(png|jpg|jpeg|webp)$/i.test(name);
}

export async function POST(req: Request) {
  const ok = await requireAdmin(req);
  if (!ok) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const formData = await req.formData();
  const slug = normalizeSlug((formData.get("slug") as string) || "");
  if (!slug) {
    return NextResponse.json({ error: "slug requerido" }, { status: 400 });
  }

  const files = formData.getAll("files") as File[];
  if (!files.length) {
    return NextResponse.json({ error: "no hay archivos" }, { status: 400 });
  }
  if (files.length > MAX_FILES) {
    return NextResponse.json({ error: `maximo ${MAX_FILES} archivos` }, { status: 400 });
  }

  for (const file of files) {
    const ext = path.extname(file.name).toLowerCase();
    if (!ALLOWED_EXTS.has(ext)) {
      return NextResponse.json({ error: `extension no permitida: ${ext}` }, { status: 400 });
    }
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: `archivo demasiado grande: ${file.name}` }, { status: 400 });
    }
  }

  const productsDir = path.join(process.cwd(), "public", "products");
  const dir = path.join(productsDir, slug);
  await fs.mkdir(dir, { recursive: true });

  // Find highest existing numbered file to continue sequence
  let maxNum = 0;
  try {
    const existing = await fs.readdir(dir);
    for (const name of existing.filter(isImageFile)) {
      const base = path.basename(name, path.extname(name));
      const n = parseInt(base, 10);
      if (!Number.isNaN(n) && n > maxNum) maxNum = n;
    }
  } catch {
    // directory may be empty or new
  }

  const urls: string[] = [];
  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const ext = path.extname(file.name).toLowerCase();
    const num = maxNum + i + 1;
    const filename = `${num}${ext}`;
    const buffer = Buffer.from(await file.arrayBuffer());
    await fs.writeFile(path.join(dir, filename), buffer);
    urls.push(`/products/${slug}/${filename}`);
  }

  return NextResponse.json({ urls, count: files.length });
}
