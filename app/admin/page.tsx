"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { useAuth } from "../components/auth-provider";
import { waMsg } from "../lib/api";

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE ||
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  "http://localhost:8080";

type Auction = {
  id: number;
  title: string;
  description: string;
  location: string;
  current_bid: number;
  reserve_price: number;
  status: string;
  end_time: string;
  image_url: string;
  created_at?: string;
  start_time?: string;
  sale_mode?: string;
  fixed_price?: number;
  min_bid_increment?: number;
  buyer_premium_pct?: number;
  auto_extend_minutes?: number;
  auto_extend_window_minutes?: number;
  price_visible?: number;
};

type Listing = {
  id: number;
  title: string;
  description: string;
  location: string;
  price: number;
  sale_type: string;
  year: number;
  status: string;
  image_url: string;
  created_at?: string;
};

type UserItem = {
  id: number;
  email: string;
  business_name: string;
  legal_representative: string;
  rfc: string;
  street_address?: string;
  colony?: string;
  municipality?: string;
  postal_code?: string;
  city?: string;
  state?: string;
  phone: string;
  mobile: string;
  status: string;
  guarantee_tier: string;
  remaining_opportunities: number;
  rejection_reason: string;
  must_change_password?: boolean;
  is_admin?: boolean;
  created_at: string;
};

type Enrollment = {
  id: number;
  auction_id: number;
  user_id: number;
  status: string;
  created_at: string;
  email?: string;
  business_name?: string;
  guarantee_tier?: string;
};

type Mode = "auctions" | "listings" | "users";
type FormState = Partial<Auction & Listing> & { id?: number };
type ImageItem = { name: string; url: string };
type ProductImages = { slug: string; images: ImageItem[] };
type Toast = { text: string; type: "success" | "error" } | null;

const TIERS = [
  { value: "50k",  label: "Paleta Blanca — $50,000 MXN" },
  { value: "100k", label: "Paleta Amarilla — $100,000 MXN" },
  { value: "250k", label: "Paleta Naranja — $250,000 MXN" },
  { value: "500k", label: "Paleta Roja — $500,000 MXN" },
];

const emptyAuction: FormState = {
  title: "", description: "", location: "San Luis Potosí, MX",
  current_bid: 0, reserve_price: 0, status: "active", end_time: "",
  image_url: "", start_time: "", sale_mode: "auction", fixed_price: 0,
  min_bid_increment: 1000, buyer_premium_pct: 14,
  auto_extend_minutes: 2, auto_extend_window_minutes: 2, price_visible: 0,
};

const emptyListing: FormState = {
  title: "", description: "", location: "San Luis Potosí, MX", price: 0,
  sale_type: "direct", year: new Date().getFullYear(), status: "active", image_url: ""
};

function extractSlug(imageUrl: string | undefined) {
  if (!imageUrl) return "";
  const match = imageUrl.match(/\/products\/([^/]+)\//);
  return match ? match[1] : "";
}
function imageExt(filename: string) {
  const idx = filename.lastIndexOf(".");
  return idx >= 0 ? filename.slice(idx) : "";
}

function Spinner() {
  return (
    <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  );
}

const STATUS_META: Record<string, { label: string; cls: string }> = {
  active:    { label: "En vivo",    cls: "bg-cyan/20 text-cyan" },
  sold:      { label: "Vendido",    cls: "bg-sand/20 text-sand/60" },
  draft:     { label: "Borrador",   cls: "bg-yellow-500/20 text-yellow-400" },
  scheduled: { label: "Programada", cls: "bg-blue-500/20 text-blue-400" },
  paused:    { label: "Pausada",    cls: "bg-orange-500/20 text-orange-400" },
  closed:    { label: "Cerrada",    cls: "bg-sand/20 text-sand/40" },
  pending:   { label: "Pendiente",  cls: "bg-yellow-500/20 text-yellow-400" },
  approved:  { label: "Aprobado",   cls: "bg-cyan/20 text-cyan" },
  rejected:  { label: "Rechazado",  cls: "bg-ember/20 text-ember" },
};

function StatusBadge({ status }: { status: string }) {
  const meta = STATUS_META[status] || { label: status, cls: "bg-sand/20 text-sand/60" };
  return (
    <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${meta.cls}`}>
      {meta.label}
    </span>
  );
}

function FieldInput({ label, id, children }: { label: string; id?: string; children: React.ReactNode }) {
  return (
    <div>
      <label htmlFor={id} className="text-xs uppercase tracking-[0.3em] text-sand/60">{label}</label>
      <div className="mt-1">{children}</div>
    </div>
  );
}

const inputCls = "w-full rounded-xl border border-sand/20 bg-graphite/70 px-4 py-3 text-sand outline-none focus:border-cyan/50 transition";

export default function AdminPage() {
  const router = useRouter();
  const { user, token, loading: authLoading, logout, openPasswordModal } = useAuth();

  // Navigation
  const [mode, setMode] = useState<Mode>("listings");

  // Loading & feedback
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<Toast>(null);
  const [message, setMessage] = useState<string | null>(null);

  // Data
  const [items, setItems] = useState<(Auction | Listing)[]>([]);
  const [users, setUsers] = useState<UserItem[]>([]);
  const [enrollments, setEnrollments] = useState<Record<number, Enrollment[]>>({});
  const [expandedEnrollments, setExpandedEnrollments] = useState<Set<number>>(new Set());

  // Form
  const [form, setForm] = useState<FormState>(emptyListing);
  const formRef = useRef<HTMLFormElement>(null);

  // Search & filter
  const [itemSearch, setItemSearch] = useState("");
  const [itemStatusFilter, setItemStatusFilter] = useState("all");
  const [userSearch, setUserSearch] = useState("");
  const [userFilter, setUserFilter] = useState("all");

  // Expanded user detail cards
  const [expandedUsers, setExpandedUsers] = useState<Set<number>>(new Set());

  // Approval tier dropdown state per user
  const [approvalTiers, setApprovalTiers] = useState<Record<number, string>>({});

  // Modals
  const [deleteTarget, setDeleteTarget] = useState<{ id: number; title: string } | null>(null);
  const [rejectTarget, setRejectTarget] = useState<number | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [passwordTarget, setPasswordTarget] = useState<UserItem | null>(null);
  const [passwordForm, setPasswordForm] = useState({ password: "", confirm: "" });
  const [opportunitiesTarget, setOpportunitiesTarget] = useState<UserItem | null>(null);
  const [opportunitiesValue, setOpportunitiesValue] = useState(5);
  const [showConvertModal, setShowConvertModal] = useState<Listing | null>(null);
  const [convertForm, setConvertForm] = useState({ reserve_price: 0, end_time: "" });

  // Image library
  const [imageCatalog, setImageCatalog] = useState<ProductImages[]>([]);
  const [selectedProduct, setSelectedProduct] = useState("");
  const [imageOrder, setImageOrder] = useState<ImageItem[]>([]);
  const [imagesLoading, setImagesLoading] = useState(false);
  const [imagesMessage, setImagesMessage] = useState<string | null>(null);
  const [catalogVersion, setCatalogVersion] = useState(0);

  // Upload
  const [uploadSlug, setUploadSlug] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(false);
  const [deleteImageTarget, setDeleteImageTarget] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const endpoint = useMemo(
    () => (mode === "auctions" ? "auctions" : "listings"),
    [mode]
  );

  function showToast(text: string, type: "success" | "error" = "success") {
    setToast({ text, type });
    setTimeout(() => setToast(null), 4000);
  }

  function authHeaders() {
    const headers: Record<string, string> = {};
    if (token) headers.Authorization = `Bearer ${token}`;
    return headers;
  }

  // ── Filtered item list ───────────────────────────────────────
  const filteredItems = useMemo(() => {
    let result = items;
    if (itemStatusFilter !== "all") {
      result = result.filter((i) => i.status === itemStatusFilter);
    }
    if (itemSearch.trim()) {
      const q = itemSearch.toLowerCase();
      result = result.filter(
        (i) =>
          i.title.toLowerCase().includes(q) ||
          i.description.toLowerCase().includes(q) ||
          i.location.toLowerCase().includes(q) ||
          String(i.id).includes(q)
      );
    }
    return result;
  }, [items, itemSearch, itemStatusFilter]);

  // ── Filtered user list ───────────────────────────────────────
  const filteredUsers = useMemo(() => {
    let result = users;
    if (userSearch.trim()) {
      const q = userSearch.toLowerCase();
      result = result.filter(
        (u) =>
          u.email.toLowerCase().includes(q) ||
          u.business_name?.toLowerCase().includes(q) ||
          u.legal_representative?.toLowerCase().includes(q) ||
          u.rfc?.toLowerCase().includes(q) ||
          u.phone?.includes(q) ||
          u.mobile?.includes(q)
      );
    }
    return result;
  }, [users, userSearch]);

  // ── Stats ────────────────────────────────────────────────────
  const stats = useMemo(() => {
    const activeAuctions = items.filter((i) => "end_time" in i && i.status === "active").length;
    const pendingUsers = users.filter((u) => u.status === "pending").length;
    const pendingEnrollments = Object.values(enrollments)
      .flat()
      .filter((e) => e.status === "pending").length;
    return { activeAuctions, pendingUsers, pendingEnrollments, totalItems: items.length };
  }, [items, users, enrollments]);

  // ── Image library ────────────────────────────────────────────
  async function loadImageCatalog() {
    if (!token) return;
    setImagesLoading(true);
    setImagesMessage(null);
    try {
      const res = await fetch("/admin/files", {
        headers: { ...authHeaders() },
        cache: "no-store",
      });
      if (!res.ok) throw new Error("No se pudieron cargar imagenes");
      const data = await res.json();
      setImageCatalog(data.products || []);
      setCatalogVersion((v) => v + 1);
      const fallback = data.products?.[0]?.slug || "";
      if (!selectedProduct && fallback) setSelectedProduct(fallback);
    } catch (err: unknown) {
      setImagesMessage(err instanceof Error ? err.message : "Error al cargar imagenes.");
    } finally {
      setImagesLoading(false);
    }
  }

  async function saveImageOrder(nextOrder: ImageItem[]) {
    if (!selectedProduct || !token) return;
    setImagesLoading(true);
    setImagesMessage(null);
    try {
      const res = await fetch("/admin/files", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({ slug: selectedProduct, order: nextOrder.map((img) => img.name) }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `Error ${res.status}`);
      }
      const ext = nextOrder[0] ? imageExt(nextOrder[0].name) : ".png";
      updateForm("image_url", `/products/${selectedProduct}/1${ext}`);
      showToast("Orden guardado");
      await loadImageCatalog();
    } catch (err: unknown) {
      setImagesMessage(err instanceof Error ? err.message : "Error al guardar el orden.");
    } finally {
      setImagesLoading(false);
    }
  }

  function moveImage(index: number, direction: number) {
    setImageOrder((prev) => {
      const next = [...prev];
      const target = index + direction;
      if (target < 0 || target >= next.length) return prev;
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }

  async function makePrimary(index: number) {
    if (index === 0) return;
    const next = [...imageOrder];
    const [item] = next.splice(index, 1);
    next.unshift(item);
    setImageOrder(next);
    await saveImageOrder(next);
  }

  // ── Upload helpers ───────────────────────────────────────────
  function titleToSlug(title: string) {
    return title
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/ñ/g, "n")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
  }

  async function handleUpload(files: FileList | null) {
    if (!files || files.length === 0) return;
    const slug = uploadSlug || selectedProduct;
    if (!slug) { showToast("Define la carpeta (slug) antes de subir fotos.", "error"); return; }
    setUploadProgress(true);
    try {
      const fd = new FormData();
      fd.append("slug", slug);
      for (let i = 0; i < files.length; i++) fd.append("files", files[i]);
      const res = await fetch("/admin/files/upload", {
        method: "POST",
        headers: authHeaders(),
        body: fd,
      });
      if (!res.ok) { const err = await res.json().catch(() => ({})); throw new Error(err.error || `Error ${res.status}`); }
      const data = await res.json();
      if (!selectedProduct && slug) setSelectedProduct(slug);
      showToast(`${data.count} foto${data.count !== 1 ? "s" : ""} subida${data.count !== 1 ? "s" : ""}`);
      await loadImageCatalog();
    } catch (err: unknown) { showToast(err instanceof Error ? err.message : "Error al subir", "error"); }
    finally { setUploadProgress(false); }
  }

  async function handleDeleteImage(imgName: string) {
    const slug = selectedProduct;
    if (!slug) return;
    try {
      const res = await fetch("/admin/files", {
        method: "DELETE",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({ slug, name: imgName }),
      });
      if (!res.ok) { const err = await res.json().catch(() => ({})); throw new Error(err.error || `Error ${res.status}`); }
      setDeleteImageTarget(null);
      if (form.image_url?.includes(imgName)) updateForm("image_url", "");
      showToast("Foto eliminada");
      await loadImageCatalog();
    } catch (err: unknown) { showToast(err instanceof Error ? err.message : "Error al eliminar", "error"); }
  }

  // ── Effects ──────────────────────────────────────────────────
  useEffect(() => {
    if (user?.is_admin) void loadImageCatalog();
  }, [user]);

  useEffect(() => {
    const catalog = imageCatalog.find((p) => p.slug === selectedProduct);
    setImageOrder(catalog ? catalog.images : []);
  }, [imageCatalog, selectedProduct]);

  useEffect(() => {
    if (!selectedProduct || !imageOrder.length) return;
    if (!form.image_url) updateForm("image_url", imageOrder[0].url);
  }, [selectedProduct, imageOrder, form.image_url]);

  useEffect(() => {
    if (!authLoading && !user) router.push("/auth/login");
    if (user?.must_change_password) openPasswordModal();
  }, [authLoading, router, user]);

  useEffect(() => {
    if (!user?.is_admin) return;
    if (mode === "users") {
      void fetchUsers();
    } else {
      setForm(mode === "auctions" ? emptyAuction : emptyListing);
      setMessage(null);
      setItemSearch("");
      setItemStatusFilter("all");
      void fetchItems();
    }
  }, [mode, user]);

  useEffect(() => {
    if (mode === "users" && user?.is_admin) void fetchUsers();
  }, [userFilter]);

  useEffect(() => {
    const slug = extractSlug(form.image_url);
    if (slug) setSelectedProduct(slug);
  }, [form.image_url]);

  useEffect(() => {
    if (form.title && !uploadSlug) {
      setUploadSlug(titleToSlug(form.title));
    }
  }, [form.title]);

  // ── Data fetching ─────────────────────────────────────────────
  async function fetchItems() {
    setLoading(true);
    try {
      const adminPath = mode === "auctions" ? "admin/auctions" : "admin/listings";
      const res = await fetch(`${API_BASE}/api/${adminPath}?limit=200`, {
        cache: "no-store",
        headers: { ...authHeaders() },
      });
      if (!res.ok) throw new Error("No se pudo cargar");
      setItems((await res.json()) || []);
    } catch { showToast("Error al cargar datos.", "error"); }
    finally { setLoading(false); }
  }

  async function fetchUsers() {
    setLoading(true);
    try {
      const url = userFilter === "all"
        ? `${API_BASE}/api/admin/users?limit=200`
        : `${API_BASE}/api/admin/users?status=${userFilter}&limit=200`;
      const res = await fetch(url, { headers: { ...authHeaders() }, cache: "no-store" });
      if (!res.ok) throw new Error();
      setUsers((await res.json()) || []);
    } catch { showToast("Error al cargar usuarios.", "error"); }
    finally { setLoading(false); }
  }

  async function fetchEnrollments(auctionId: number) {
    try {
      const res = await fetch(`${API_BASE}/api/admin/auctions/${auctionId}/enrollments`, {
        headers: { ...authHeaders() },
        cache: "no-store",
      });
      if (!res.ok) return;
      const data = await res.json();
      setEnrollments((prev) => ({ ...prev, [auctionId]: data || [] }));
    } catch { /* silent */ }
  }

  function toggleEnrollments(auctionId: number) {
    setExpandedEnrollments((prev) => {
      const next = new Set(prev);
      if (next.has(auctionId)) {
        next.delete(auctionId);
      } else {
        next.add(auctionId);
        void fetchEnrollments(auctionId);
      }
      return next;
    });
  }

  // ── Actions ───────────────────────────────────────────────────
  async function handleEnrollmentAction(auctionId: number, userId: number, action: "approve" | "reject") {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/admin/auctions/${auctionId}/enrollments/${userId}/${action}`, {
        method: "PUT", headers: { ...authHeaders() },
      });
      if (!res.ok) throw new Error("Error");
      showToast(action === "approve" ? "Inscripcion aprobada" : "Inscripcion rechazada");
      await fetchEnrollments(auctionId);
    } catch { showToast("Error al procesar inscripcion", "error"); }
    finally { setLoading(false); }
  }

  async function handleQuickStatus(id: number, newStatus: string) {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/admin/${endpoint}/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) throw new Error();
      showToast(`Estado actualizado: ${STATUS_META[newStatus]?.label || newStatus}`);
      await fetchItems();
    } catch { showToast("Error al actualizar estado", "error"); }
    finally { setLoading(false); }
  }

  async function handleSetOpportunities(e: React.FormEvent) {
    e.preventDefault();
    if (!opportunitiesTarget || !token) return;
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/admin/users/${opportunitiesTarget.id}/opportunities`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({ opportunities: opportunitiesValue }),
      });
      if (!res.ok) { const err = await res.json(); throw new Error(err.error || "Error"); }
      showToast(`Oportunidades actualizadas: ${opportunitiesValue}`);
      setOpportunitiesTarget(null);
      await fetchUsers();
    } catch (err: unknown) { showToast(err instanceof Error ? err.message : "Error", "error"); }
    finally { setLoading(false); }
  }

  async function handleSetPassword(e: React.FormEvent) {
    e.preventDefault();
    if (!token || !passwordTarget) return;
    if (passwordForm.password.length < 8) { showToast("La contrasena debe tener al menos 8 caracteres.", "error"); return; }
    if (passwordForm.password !== passwordForm.confirm) { showToast("Las contrasenas no coinciden.", "error"); return; }
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/admin/users/${passwordTarget.id}/password`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({ password: passwordForm.password }),
      });
      if (!res.ok) { const err = await res.json(); throw new Error(err.error || "Error"); }
      showToast("Contrasena asignada. El usuario debera cambiarla al ingresar.");
      setPasswordTarget(null);
      setPasswordForm({ password: "", confirm: "" });
      await fetchUsers();
    } catch (err: unknown) { showToast(err instanceof Error ? err.message : "Error", "error"); }
    finally { setLoading(false); }
  }

  async function handleSetAdmin(userId: number, isAdmin: boolean) {
    if (!token) return;
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/admin/users/${userId}/admin`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({ is_admin: isAdmin }),
      });
      if (!res.ok) { const err = await res.json(); throw new Error(err.error || "Error"); }
      showToast(isAdmin ? "Rol admin asignado." : "Rol admin removido.");
      await fetchUsers();
    } catch (err: unknown) { showToast(err instanceof Error ? err.message : "Error", "error"); }
    finally { setLoading(false); }
  }

  function updateForm(key: keyof FormState, value: string | number) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleCreateOrUpdate(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);
    if (!token) return;
    setLoading(true);
    try {
      const isUpdate = Boolean(form.id);
      const url = isUpdate
        ? `${API_BASE}/api/admin/${endpoint}/${form.id}`
        : `${API_BASE}/api/admin/${endpoint}`;
      const res = await fetch(url, {
        method: isUpdate ? "PUT" : "POST",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify(form),
      });
      if (!res.ok) { const err = await res.json(); throw new Error(err.error || "Error"); }
      showToast(isUpdate ? "Actualizado correctamente" : "Creado correctamente");
      setForm(mode === "auctions" ? emptyAuction : emptyListing);
      await fetchItems();
    } catch (err: unknown) { showToast(err instanceof Error ? err.message : "Error desconocido", "error"); }
    finally { setLoading(false); }
  }

  async function confirmDelete() {
    if (!deleteTarget || !token) return;
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/admin/${endpoint}/${deleteTarget.id}`, {
        method: "DELETE", headers: { ...authHeaders() },
      });
      if (!res.ok) throw new Error("Error al eliminar");
      showToast("Eliminado correctamente");
      setDeleteTarget(null);
      await fetchItems();
    } catch { showToast("Error al eliminar", "error"); }
    finally { setLoading(false); }
  }

  async function handleConvertToAuction() {
    if (!showConvertModal || !token) return;
    if (!convertForm.end_time) { showToast("Define una fecha de cierre.", "error"); return; }
    const endTime = new Date(convertForm.end_time);
    if (Number.isNaN(endTime.getTime())) { showToast("Fecha de cierre invalida.", "error"); return; }
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/admin/auctions`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({
          title: showConvertModal.title,
          description: showConvertModal.description,
          location: showConvertModal.location,
          current_bid: 0,
          reserve_price: convertForm.reserve_price || showConvertModal.price,
          status: "active",
          end_time: endTime.toISOString(),
          image_url: showConvertModal.image_url,
          sale_mode: "auction",
          min_bid_increment: 1000,
          buyer_premium_pct: 14,
          auto_extend_minutes: 2,
          auto_extend_window_minutes: 2,
          price_visible: 0,
        }),
      });
      if (!res.ok) { const err = await res.json(); throw new Error(err.error || "Error"); }
      showToast(`Subasta creada para "${showConvertModal.title}"`);
      setShowConvertModal(null);
      setConvertForm({ reserve_price: 0, end_time: "" });
    } catch (err: unknown) { showToast(err instanceof Error ? err.message : "Error", "error"); }
    finally { setLoading(false); }
  }

  async function handleApprove(userId: number) {
    const tier = approvalTiers[userId] || "50k";
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/admin/users/${userId}/approve`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({ guarantee_tier: tier }),
      });
      if (!res.ok) throw new Error("Error al aprobar");
      showToast("Usuario aprobado");
      await fetchUsers();
    } catch (err: unknown) { showToast(err instanceof Error ? err.message : "Error", "error"); }
    finally { setLoading(false); }
  }

  function handleReject(userId: number) {
    setRejectTarget(userId);
    setRejectReason("");
  }

  async function submitReject(e: React.FormEvent) {
    e.preventDefault();
    if (!rejectTarget || !rejectReason.trim()) return;
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/admin/users/${rejectTarget}/reject`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({ reason: rejectReason.trim() }),
      });
      if (!res.ok) throw new Error("Error al rechazar");
      showToast("Usuario rechazado");
      setRejectTarget(null);
      setRejectReason("");
      await fetchUsers();
    } catch (err: unknown) { showToast(err instanceof Error ? err.message : "Error", "error"); }
    finally { setLoading(false); }
  }

  function formatPrice(price: number) {
    return price > 0 ? `$${price.toLocaleString("es-MX")} MXN` : "Consultar";
  }

  // ── Auth guards ───────────────────────────────────────────────
  if (authLoading) {
    return (
      <section className="section py-20 flex items-center justify-center">
        <div className="flex items-center gap-2 text-sand/60"><Spinner />Cargando panel...</div>
      </section>
    );
  }

  if (!user) return null;

  if (!user.is_admin) {
    return (
      <section className="section py-16">
        <div className="mx-auto max-w-xl text-center glass rounded-[24px] p-6 sm:rounded-[32px] sm:p-8">
          <h1 className="text-2xl font-semibold text-sand">Acceso restringido</h1>
          <p className="mt-2 text-sm text-sand/60">Tu cuenta no tiene permisos de administracion.</p>
          <button onClick={logout} className="button-ghost mt-6 text-sm">Cerrar sesion</button>
        </div>
      </section>
    );
  }

  // ── Render ────────────────────────────────────────────────────
  return (
    <main className="section py-8 sm:py-16 min-h-screen">
      <div className="glass rounded-[24px] p-4 sm:rounded-[32px] sm:p-8">

        {/* ── Header ─────────────────────────────────────────── */}
        <div className="space-y-4">
          <div className="flex items-start justify-between">
            <div>
              <p className="tag">Admin</p>
              <h1 className="mt-4 text-2xl font-semibold text-sand sm:text-3xl">Panel de administracion</h1>
              <p className="text-sm text-sand/70 sm:text-base">Gestion de subastas, productos y usuarios.</p>
            </div>
            <a href="/" className="rounded-xl border border-sand/20 px-4 py-2 text-xs text-sand/60 transition hover:text-sand hover:border-sand/40">
              Ver sitio
            </a>
          </div>

          {/* ── Stats ──────────────────────────────────────── */}
          {(mode === "users" ? users.length > 0 : items.length > 0) && (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {mode !== "users" ? (
                <>
                  <div className="rounded-2xl border border-sand/10 bg-graphite/40 px-4 py-3">
                    <p className="text-[10px] uppercase tracking-wider text-sand/50">Total</p>
                    <p className="mt-1 text-2xl font-semibold text-sand">{items.length}</p>
                  </div>
                  <div className="rounded-2xl border border-cyan/20 bg-cyan/5 px-4 py-3">
                    <p className="text-[10px] uppercase tracking-wider text-sand/50">En vivo</p>
                    <p className="mt-1 text-2xl font-semibold text-cyan">{stats.activeAuctions}</p>
                  </div>
                  <div className="rounded-2xl border border-sand/10 bg-graphite/40 px-4 py-3">
                    <p className="text-[10px] uppercase tracking-wider text-sand/50">Coinciden</p>
                    <p className="mt-1 text-2xl font-semibold text-sand">{filteredItems.length}</p>
                  </div>
                  <div className={`rounded-2xl border px-4 py-3 ${stats.pendingEnrollments > 0 ? "border-yellow-500/30 bg-yellow-500/5" : "border-sand/10 bg-graphite/40"}`}>
                    <p className="text-[10px] uppercase tracking-wider text-sand/50">Inscripciones pend.</p>
                    <p className={`mt-1 text-2xl font-semibold ${stats.pendingEnrollments > 0 ? "text-yellow-400" : "text-sand"}`}>{stats.pendingEnrollments}</p>
                  </div>
                </>
              ) : (
                <>
                  <div className="rounded-2xl border border-sand/10 bg-graphite/40 px-4 py-3">
                    <p className="text-[10px] uppercase tracking-wider text-sand/50">Total</p>
                    <p className="mt-1 text-2xl font-semibold text-sand">{users.length}</p>
                  </div>
                  <div className={`rounded-2xl border px-4 py-3 ${stats.pendingUsers > 0 ? "border-yellow-500/30 bg-yellow-500/5" : "border-sand/10 bg-graphite/40"}`}>
                    <p className="text-[10px] uppercase tracking-wider text-sand/50">Pendientes</p>
                    <p className={`mt-1 text-2xl font-semibold ${stats.pendingUsers > 0 ? "text-yellow-400" : "text-sand"}`}>{stats.pendingUsers}</p>
                  </div>
                  <div className="rounded-2xl border border-cyan/20 bg-cyan/5 px-4 py-3">
                    <p className="text-[10px] uppercase tracking-wider text-sand/50">Aprobados</p>
                    <p className="mt-1 text-2xl font-semibold text-cyan">{users.filter((u) => u.status === "approved").length}</p>
                  </div>
                  <div className="rounded-2xl border border-sand/10 bg-graphite/40 px-4 py-3">
                    <p className="text-[10px] uppercase tracking-wider text-sand/50">Coinciden</p>
                    <p className="mt-1 text-2xl font-semibold text-sand">{filteredUsers.length}</p>
                  </div>
                </>
              )}
            </div>
          )}

          {/* ── Tabs ─────────────────────────────────────────── */}
          <div className="flex flex-wrap gap-2 sm:gap-3">
            {(["listings", "auctions", "users"] as Mode[]).map((m) => (
              <button
                key={m}
                className={`rounded-full px-4 py-2 text-xs font-semibold transition sm:text-sm ${
                  mode === m ? "bg-sand/20 text-sand border border-sand/40" : "border border-sand/20 text-sand/60 hover:text-sand hover:border-sand/40"
                }`}
                onClick={() => { setMode(m); setMessage(null); }}
              >
                {m === "auctions" ? "Subastas" : m === "listings" ? "Productos" : "Usuarios"}
                {m === "users" && stats.pendingUsers > 0 && (
                  <span className="ml-1.5 rounded-full bg-yellow-500/30 px-1.5 py-0.5 text-[10px] text-yellow-400">{stats.pendingUsers}</span>
                )}
              </button>
            ))}
          </div>
        </div>

        {message && (
          <div className={`mt-4 rounded-xl p-3 text-sm ${
            message.includes("Error") ? "bg-ember/10 text-ember" : "bg-cyan/10 text-cyan"
          }`}>
            {message}
          </div>
        )}

        {/* ── Users tab ──────────────────────────────────────── */}
        {mode === "users" ? (
          <div className="mt-6 space-y-4">
            {/* Filters row */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative flex-1 min-w-[180px]">
                <svg className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-sand/40" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
                </svg>
                <input
                  className="w-full rounded-xl border border-sand/20 bg-graphite/70 py-2 pl-9 pr-3 text-sm text-sand placeholder:text-sand/30 outline-none focus:border-cyan/50 transition"
                  placeholder="Buscar por nombre, email, RFC..."
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                />
              </div>
              {[
                { key: "all", label: "Todos" },
                { key: "pending", label: "Pendientes" },
                { key: "approved", label: "Aprobados" },
                { key: "rejected", label: "Rechazados" },
              ].map(({ key, label }) => (
                <button
                  key={key}
                  className={`rounded-full px-3 py-1.5 text-xs transition sm:px-4 ${
                    userFilter === key ? "bg-sand/20 text-sand" : "bg-graphite/40 text-sand/50 hover:text-sand"
                  }`}
                  onClick={() => setUserFilter(key)}
                >
                  {label}
                </button>
              ))}
              <button className="rounded-full border border-sand/20 px-3 py-1.5 text-xs text-sand/60 transition hover:text-sand" onClick={fetchUsers}>
                Recargar
              </button>
            </div>

            {loading && <div className="flex items-center gap-2 text-sand/60"><Spinner />Cargando usuarios...</div>}

            <div className="grid gap-3">
              {filteredUsers.map((u) => {
                const isExpanded = expandedUsers.has(u.id);
                const tierValue = approvalTiers[u.id] || "50k";
                return (
                  <div key={u.id} className="card space-y-3">
                    {/* Top row */}
                    <div className="flex items-start gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-base font-semibold text-sand">{u.business_name || u.email}</p>
                          <StatusBadge status={u.status} />
                          {u.is_admin && (
                            <span className="rounded-full bg-cyan/20 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-cyan">Admin</span>
                          )}
                          {u.must_change_password && (
                            <span className="rounded-full bg-yellow-500/20 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-yellow-400">Cambia contraseña</span>
                          )}
                        </div>
                        <p className="text-sm text-sand/60">{u.email}</p>
                      </div>
                    </div>

                    {/* Quick info row */}
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-sand/50">
                      {u.rfc && <span>RFC: {u.rfc}</span>}
                      {u.phone && <span>Tel: {u.phone}</span>}
                      {u.mobile && <span>Cel: {u.mobile}</span>}
                      {u.legal_representative && <span>Rep: {u.legal_representative}</span>}
                      <span>Registrado: {new Date(u.created_at).toLocaleDateString("es-MX")}</span>
                    </div>
                    {u.guarantee_tier && (
                      <p className="text-xs text-cyan">Tier: {u.guarantee_tier} | Oportunidades: {u.remaining_opportunities}</p>
                    )}
                    {u.rejection_reason && <p className="text-xs text-ember">Razon: {u.rejection_reason}</p>}

                    {/* Expandable details */}
                    <button
                      className="text-xs text-sand/40 hover:text-sand transition"
                      onClick={() => setExpandedUsers((prev) => {
                        const next = new Set(prev);
                        next.has(u.id) ? next.delete(u.id) : next.add(u.id);
                        return next;
                      })}
                    >
                      {isExpanded ? "▲ Ocultar detalles" : "▼ Ver detalles completos"}
                    </button>

                    {isExpanded && (
                      <div className="rounded-xl border border-sand/10 bg-graphite/40 p-4 space-y-2 text-xs text-sand/60">
                        {[
                          ["Razon Social / Nombre", u.business_name],
                          ["Representante Legal", u.legal_representative],
                          ["RFC", u.rfc],
                          ["Calle y número", u.street_address],
                          ["Colonia", u.colony],
                          ["Municipio / Delegación", u.municipality],
                          ["Ciudad", u.city],
                          ["Estado", u.state],
                          ["Código postal", u.postal_code],
                          ["Teléfono", u.phone],
                          ["Celular", u.mobile],
                        ].filter(([, v]) => v).map(([label, value]) => (
                          <div key={label} className="flex justify-between gap-4 border-b border-sand/10 pb-1">
                            <span className="shrink-0 text-sand/40">{label}</span>
                            <span className="text-sand/80 text-right">{value}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Approval actions — only when pending */}
                    {u.status === "pending" && (
                      <div className="rounded-xl border border-cyan/20 bg-cyan/5 p-3 space-y-2">
                        <p className="text-xs font-semibold text-sand/60 uppercase tracking-wider">Aprobar con nivel de garantia</p>
                        <div className="flex flex-wrap items-center gap-2">
                          <select
                            className="rounded-xl border border-sand/20 bg-graphite/80 px-3 py-2 text-xs text-sand flex-1 min-w-[180px]"
                            value={tierValue}
                            onChange={(e) => setApprovalTiers((prev) => ({ ...prev, [u.id]: e.target.value }))}
                          >
                            {TIERS.map((t) => (
                              <option key={t.value} value={t.value}>{t.label}</option>
                            ))}
                          </select>
                          <button
                            className="rounded-xl bg-cyan/20 px-4 py-2 text-xs font-semibold text-cyan transition hover:bg-cyan/30"
                            onClick={() => handleApprove(u.id)}
                          >
                            Aprobar
                          </button>
                          <button
                            className="rounded-xl bg-ember/20 px-4 py-2 text-xs font-semibold text-ember transition hover:bg-ember/30"
                            onClick={() => handleReject(u.id)}
                          >
                            Rechazar
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Action buttons */}
                    <div className="flex flex-wrap gap-2">
                      {/* WhatsApp contact */}
                      {(u.phone || u.mobile) && (
                        <a
                          href={waMsg(`Hola ${u.business_name || u.legal_representative || ""}, te contactamos de MAQZONE respecto a tu cuenta.`).replace(
                            "wa.me/524442164550",
                            `wa.me/52${(u.mobile || u.phone || "").replace(/\D/g, "")}`
                          )}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="rounded-xl border border-green-500/30 bg-green-500/10 px-3 py-1.5 text-xs font-semibold text-green-400 transition hover:bg-green-500/20"
                        >
                          WhatsApp
                        </a>
                      )}
                      <button
                        className="rounded-xl border border-sand/20 px-3 py-1.5 text-xs font-semibold text-sand/70 transition hover:text-sand hover:border-sand/40"
                        onClick={() => { setPasswordTarget(u); setPasswordForm({ password: "", confirm: "" }); }}
                      >
                        Asignar contraseña
                      </button>
                      <button
                        className="rounded-xl border border-cyan/30 px-3 py-1.5 text-xs font-semibold text-cyan transition hover:bg-cyan/10"
                        onClick={() => handleSetAdmin(u.id, !u.is_admin)}
                      >
                        {u.is_admin ? "Quitar admin" : "Hacer admin"}
                      </button>
                      <button
                        className="rounded-xl border border-sand/20 px-3 py-1.5 text-xs font-semibold text-sand/70 transition hover:text-sand hover:border-sand/40"
                        onClick={() => { setOpportunitiesTarget(u); setOpportunitiesValue(u.remaining_opportunities); }}
                      >
                        Oportunidades ({u.remaining_opportunities})
                      </button>
                    </div>
                  </div>
                );
              })}
              {!loading && filteredUsers.length === 0 && (
                <div className="card text-center py-8">
                  <p className="text-sm text-sand/50">{userSearch ? `Sin resultados para "${userSearch}"` : "No hay usuarios con este filtro."}</p>
                </div>
              )}
            </div>
          </div>

        ) : (
          /* ── Auctions / Listings CRUD ──────────────────────── */
          <div className="mt-8 grid gap-6 lg:grid-cols-[0.6fr_1fr]">

            {/* Form */}
            <form ref={formRef} onSubmit={handleCreateOrUpdate} className="card space-y-4">
              <h3 className="text-base font-semibold text-sand sm:text-lg">
                {form.id ? "Editar" : "Crear"} {mode === "auctions" ? "subasta" : "producto"}
              </h3>

              <FieldInput label="Titulo" id="admin-title">
                <input id="admin-title" className={inputCls} value={form.title || ""} onChange={(e) => updateForm("title", e.target.value)} required />
              </FieldInput>
              <FieldInput label="Descripcion" id="admin-desc">
                <textarea id="admin-desc" className={inputCls} value={form.description || ""} onChange={(e) => updateForm("description", e.target.value)} rows={3} required />
              </FieldInput>
              <FieldInput label="Ubicacion" id="admin-loc">
                <input id="admin-loc" className={inputCls} value={form.location || ""} onChange={(e) => updateForm("location", e.target.value)} required />
              </FieldInput>

              {mode === "auctions" ? (
                <>
                  <FieldInput label="Tipo de venta" id="admin-salemode">
                    <select id="admin-salemode" className={inputCls} value={form.sale_mode || "auction"} onChange={(e) => updateForm("sale_mode", e.target.value)}>
                      <option value="auction">Subasta (puja)</option>
                      <option value="fixed">Precio fijo</option>
                    </select>
                  </FieldInput>

                  {form.sale_mode === "fixed" ? (
                    <FieldInput label="Precio fijo (MXN)" id="admin-fixedprice">
                      <input id="admin-fixedprice" type="number" className={inputCls} value={form.fixed_price || 0} onChange={(e) => updateForm("fixed_price", Number(e.target.value))} />
                    </FieldInput>
                  ) : (
                    <div className="grid grid-cols-2 gap-3">
                      <FieldInput label="Puja inicial" id="admin-bid">
                        <input id="admin-bid" type="number" className={inputCls} value={form.current_bid || 0} onChange={(e) => updateForm("current_bid", Number(e.target.value))} />
                      </FieldInput>
                      <FieldInput label="Precio reserva" id="admin-reserve">
                        <input id="admin-reserve" type="number" className={inputCls} value={form.reserve_price || 0} onChange={(e) => updateForm("reserve_price", Number(e.target.value))} />
                      </FieldInput>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-3">
                    <FieldInput label="Incremento mínimo (MXN)" id="admin-increment">
                      <input id="admin-increment" type="number" className={inputCls} value={form.min_bid_increment ?? 1000} onChange={(e) => updateForm("min_bid_increment", Number(e.target.value))} />
                    </FieldInput>
                    <FieldInput label="Comisión comprador (%)" id="admin-premium">
                      <input id="admin-premium" type="number" className={inputCls} value={form.buyer_premium_pct ?? 14} onChange={(e) => updateForm("buyer_premium_pct", Number(e.target.value))} />
                    </FieldInput>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <FieldInput label="Inicio (opcional)" id="admin-starttime">
                      <input id="admin-starttime" type="datetime-local" className={inputCls}
                        value={form.start_time?.replace("Z", "").slice(0, 16) || ""}
                        onChange={(e) => updateForm("start_time", e.target.value ? new Date(e.target.value).toISOString() : "")} />
                    </FieldInput>
                    <FieldInput label="Cierre" id="admin-endtime">
                      <input id="admin-endtime" type="datetime-local" className={inputCls}
                        value={form.end_time?.replace("Z", "").slice(0, 16) || ""}
                        onChange={(e) => updateForm("end_time", e.target.value ? new Date(e.target.value).toISOString() : "")}
                        required />
                    </FieldInput>
                  </div>

                  <div className="rounded-xl border border-sand/10 bg-graphite/40 p-4 space-y-3">
                    <p className="text-xs uppercase tracking-[0.3em] text-sand/50">Auto-extensión de tiempo</p>
                    <div className="grid grid-cols-2 gap-3">
                      <FieldInput label="Extender (min)" id="admin-extend-min">
                        <input id="admin-extend-min" type="number" className={inputCls} value={form.auto_extend_minutes ?? 2} onChange={(e) => updateForm("auto_extend_minutes", Number(e.target.value))} min={1} />
                      </FieldInput>
                      <FieldInput label="Ventana de activación (min)" id="admin-extend-window">
                        <input id="admin-extend-window" type="number" className={inputCls} value={form.auto_extend_window_minutes ?? 2} onChange={(e) => updateForm("auto_extend_window_minutes", Number(e.target.value))} min={1} />
                      </FieldInput>
                    </div>
                    <p className="text-xs text-sand/40">Si alguien puja dentro de los últimos N minutos, se extiende M minutos.</p>
                  </div>

                  <div className="flex items-center gap-3 rounded-xl border border-sand/10 bg-graphite/40 px-4 py-3">
                    <input
                      id="admin-pricevisible"
                      type="checkbox"
                      className="h-4 w-4 accent-cyan"
                      checked={(form.price_visible ?? 0) === 1}
                      onChange={(e) => updateForm("price_visible", e.target.checked ? 1 : 0)}
                    />
                    <div>
                      <label htmlFor="admin-pricevisible" className="text-sm font-medium text-sand cursor-pointer">
                        Mostrar precio actual a participantes
                      </label>
                      <p className="text-xs text-sand/40">Desmarcado: los usuarios pujan sin ver el precio actual.</p>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <FieldInput label="Precio (MXN)" id="admin-price">
                      <input id="admin-price" type="number" className={inputCls} value={form.price || 0} onChange={(e) => updateForm("price", Number(e.target.value))} />
                    </FieldInput>
                    <FieldInput label="Año" id="admin-year">
                      <input id="admin-year" type="number" className={inputCls} value={form.year || new Date().getFullYear()} onChange={(e) => updateForm("year", Number(e.target.value))} />
                    </FieldInput>
                  </div>
                  <FieldInput label="Tipo de venta" id="admin-saletype">
                    <select id="admin-saletype" className={inputCls} value={form.sale_type || "direct"} onChange={(e) => updateForm("sale_type", e.target.value)}>
                      <option value="direct">Venta directa</option>
                      <option value="auction">Subasta premium</option>
                    </select>
                  </FieldInput>
                </>
              )}

              {/* Image library */}
              <div className="rounded-2xl border border-sand/10 bg-graphite/50 p-4 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-xs uppercase tracking-[0.3em] text-sand/60">Fotos del producto</p>
                  <div className="flex gap-2">
                    <button type="button" onClick={loadImageCatalog} className="rounded-full border border-sand/20 px-3 py-1 text-[10px] text-sand/60 transition hover:text-sand">
                      Recargar
                    </button>
                    <button type="button" onClick={() => saveImageOrder(imageOrder)} disabled={!imageOrder.length || imagesLoading} className="rounded-full border border-cyan/30 px-3 py-1 text-[10px] text-cyan transition hover:bg-cyan/10 disabled:opacity-50">
                      Guardar orden
                    </button>
                  </div>
                </div>

                {/* Slug input */}
                <div className="flex items-center gap-2">
                  <label className="shrink-0 text-[10px] uppercase tracking-[0.2em] text-sand/50">Carpeta:</label>
                  <input
                    className="min-w-0 flex-1 rounded-xl border border-sand/20 bg-graphite/70 px-3 py-1.5 text-xs text-sand outline-none focus:border-cyan/50 transition"
                    value={uploadSlug}
                    onChange={(e) => setUploadSlug(e.target.value.replace(/[^a-z0-9-_]/g, ""))}
                    placeholder="ej: haas-sl30-nuevo"
                  />
                  {imageCatalog.length > 0 && (
                    <select
                      value={selectedProduct}
                      onChange={(e) => { setSelectedProduct(e.target.value); setUploadSlug(e.target.value); }}
                      className="rounded-xl border border-sand/15 bg-graphite/70 px-2 py-1.5 text-[10px] text-sand"
                    >
                      <option value="">Existentes</option>
                      {imageCatalog.map((p) => <option key={p.slug} value={p.slug}>{p.slug}</option>)}
                    </select>
                  )}
                </div>

                {/* Dropzone */}
                <div
                  className={`relative flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed px-4 py-6 text-center transition cursor-pointer ${
                    dragOver ? "border-cyan bg-cyan/5" : "border-sand/20 hover:border-sand/40"
                  }`}
                  onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={(e) => { e.preventDefault(); setDragOver(false); void handleUpload(e.dataTransfer.files); }}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <svg className="h-8 w-8 text-sand/30" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5" />
                  </svg>
                  <p className="text-xs text-sand/50">Arrastra fotos aquí o haz clic para seleccionar</p>
                  <p className="text-[10px] text-sand/30">JPG · PNG · WEBP — máx 10 MB por foto</p>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".jpg,.jpeg,.png,.webp"
                    multiple
                    className="sr-only"
                    onChange={(e) => void handleUpload(e.target.files)}
                  />
                </div>

                {uploadProgress && (
                  <div className="flex items-center gap-2 text-xs text-cyan">
                    <Spinner />Subiendo fotos...
                  </div>
                )}

                {imagesMessage && <div className="rounded-xl bg-graphite/60 px-3 py-2 text-xs text-sand/70">{imagesMessage}</div>}
                {imagesLoading && !uploadProgress && <div className="flex items-center gap-2 text-xs text-sand/60"><Spinner />Procesando...</div>}

                {/* Gallery */}
                {selectedProduct && imageOrder.length > 0 && (
                  <div>
                    <p className="mb-2 text-[10px] text-sand/40">Galería ({imageOrder.length} foto{imageOrder.length !== 1 ? "s" : ""})</p>
                    <div className="grid gap-3 grid-cols-2 sm:grid-cols-4">
                      {imageOrder.map((img, index) => (
                        <div key={img.name} className="relative rounded-xl border border-sand/10 bg-graphite/70 p-1.5">
                          <button type="button" onClick={() => updateForm("image_url", img.url)} className="relative block w-full overflow-hidden rounded-lg">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={`${img.url}?v=${catalogVersion}`} alt={img.name} className={`h-20 w-full object-cover ${index === 0 ? "ring-2 ring-cyan" : ""}`} />
                            {index === 0 && (
                              <span className="absolute left-1 top-1 rounded-full bg-cyan/80 px-1.5 py-0.5 text-[9px] font-semibold text-white">Principal</span>
                            )}
                            {index > 0 && (
                              <span className="absolute left-1 top-1 rounded-full bg-black/60 px-1.5 py-0.5 text-[9px] text-white">#{index + 1}</span>
                            )}
                          </button>
                          {/* Delete button */}
                          <button
                            type="button"
                            className="absolute right-2 top-2 rounded-full bg-black/60 p-0.5 text-ember transition hover:bg-ember/20"
                            onClick={() => setDeleteImageTarget(deleteImageTarget === img.name ? null : img.name)}
                          >
                            <svg className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
                              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                            </svg>
                          </button>
                          {/* Inline delete confirm */}
                          {deleteImageTarget === img.name && (
                            <div className="mt-1 flex items-center gap-1">
                              <span className="text-[9px] text-ember flex-1">¿Eliminar?</span>
                              <button type="button" className="rounded bg-ember/20 px-1.5 py-0.5 text-[9px] font-semibold text-ember hover:bg-ember/30" onClick={() => void handleDeleteImage(img.name)}>Sí</button>
                              <button type="button" className="rounded bg-graphite/60 px-1.5 py-0.5 text-[9px] text-sand/50 hover:text-sand" onClick={() => setDeleteImageTarget(null)}>No</button>
                            </div>
                          )}
                          {/* Reorder + Primary buttons */}
                          <div className="mt-1 flex flex-wrap items-center gap-1">
                            <button type="button" className="rounded border border-sand/20 px-1.5 py-0.5 text-[9px] text-sand/60 transition hover:text-sand disabled:opacity-30" disabled={index === 0} onClick={() => moveImage(index, -1)}>▲</button>
                            <button type="button" className="rounded border border-sand/20 px-1.5 py-0.5 text-[9px] text-sand/60 transition hover:text-sand disabled:opacity-30" disabled={index === imageOrder.length - 1} onClick={() => moveImage(index, 1)}>▼</button>
                            {index > 0 && (
                              <button type="button" className="rounded border border-cyan/30 px-1.5 py-0.5 text-[9px] text-cyan transition hover:bg-cyan/10" onClick={() => makePrimary(index)}>★</button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Main image URL field */}
                <FieldInput label="URL imagen principal" id="admin-img">
                  <input id="admin-img" className={inputCls} value={form.image_url || ""} onChange={(e) => updateForm("image_url", e.target.value)} placeholder="/products/nombre-producto/1.jpg" />
                  {form.image_url && (
                    <div className="mt-2 overflow-hidden rounded-xl border border-sand/10 bg-steel">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={`${form.image_url}?v=${catalogVersion}`} alt="Preview" className="h-32 w-full object-cover" />
                    </div>
                  )}
                </FieldInput>
              </div>

              <FieldInput label="Estado" id="admin-status">
                <select id="admin-status" className={inputCls} value={form.status || "active"} onChange={(e) => updateForm("status", e.target.value)}>
                  <option value="active">Activo</option>
                  <option value="scheduled">Programado</option>
                  <option value="draft">Borrador</option>
                  <option value="paused">Pausado</option>
                  <option value="closed">Cerrado</option>
                  <option value="sold">Vendido</option>
                </select>
              </FieldInput>

              <div className="flex gap-3">
                <button className="button-primary flex-1 min-h-[44px]" disabled={loading}>
                  {loading ? <span className="flex items-center justify-center gap-2"><Spinner />Guardando...</span> : form.id ? "Actualizar" : "Crear"}
                </button>
                {form.id && (
                  <button type="button" className="rounded-xl border border-sand/20 px-4 py-2 text-sm text-sand/60 transition hover:text-sand" onClick={() => { setForm(mode === "auctions" ? emptyAuction : emptyListing); setMessage(null); }}>
                    Cancelar
                  </button>
                )}
              </div>
            </form>

            {/* Items list */}
            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-lg font-semibold text-sand sm:text-xl flex-1">
                  {mode === "auctions" ? "Subastas" : "Productos"}{" "}
                  <span className="text-sand/40 text-base">({filteredItems.length}/{items.length})</span>
                </h2>
                <button className="rounded-full border border-sand/20 px-3 py-1.5 text-xs text-sand/60 transition hover:text-sand" onClick={fetchItems}>Recargar</button>
              </div>

              {/* Search + status filter */}
              <div className="flex flex-wrap gap-2">
                <div className="relative flex-1 min-w-[160px]">
                  <svg className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-sand/40" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
                  </svg>
                  <input
                    className="w-full rounded-xl border border-sand/20 bg-graphite/70 py-2 pl-9 pr-3 text-sm text-sand placeholder:text-sand/30 outline-none focus:border-cyan/50 transition"
                    placeholder="Buscar..."
                    value={itemSearch}
                    onChange={(e) => setItemSearch(e.target.value)}
                  />
                </div>
                <select
                  className="rounded-xl border border-sand/20 bg-graphite/70 px-3 py-2 text-xs text-sand"
                  value={itemStatusFilter}
                  onChange={(e) => setItemStatusFilter(e.target.value)}
                >
                  <option value="all">Todos los estados</option>
                  <option value="active">En vivo</option>
                  <option value="scheduled">Programado</option>
                  <option value="draft">Borrador</option>
                  <option value="paused">Pausado</option>
                  <option value="closed">Cerrado</option>
                  <option value="sold">Vendido</option>
                </select>
              </div>

              {loading && <div className="flex items-center gap-2 text-sand/60"><Spinner />Cargando...</div>}

              <div className="grid gap-3">
                {filteredItems.map((item) => {
                  const pendingCount = (enrollments[item.id] || []).filter((e) => e.status === "pending").length;
                  return (
                    <div key={item.id} className="card space-y-3">
                      <div className="flex gap-4">
                        {item.image_url && (
                          <div className="hidden sm:block shrink-0 h-20 w-28 overflow-hidden rounded-xl border border-sand/10 bg-steel">
                            <Image src={item.image_url} alt={item.title} width={200} height={120} className="h-full w-full object-cover" />
                          </div>
                        )}
                        <div className="min-w-0 flex-1 space-y-2">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <div className="flex flex-wrap items-center gap-2">
                                <p className="text-base font-semibold text-sand truncate">{item.title}</p>
                                <StatusBadge status={item.status} />
                                {"sale_mode" in item && (item as Auction).sale_mode === "fixed" && (
                                  <span className="rounded-full bg-sand/10 px-2 py-0.5 text-[10px] text-sand/60">Precio fijo</span>
                                )}
                                {pendingCount > 0 && (
                                  <span className="rounded-full bg-yellow-500/20 px-2 py-0.5 text-[10px] font-semibold text-yellow-400">
                                    {pendingCount} inscripción{pendingCount !== 1 ? "es" : ""} pend.
                                  </span>
                                )}
                              </div>
                              <div className="flex flex-wrap items-center gap-3 mt-1 text-xs text-sand/50">
                                <span>{item.location}</span>
                                {"year" in item && <span>Año {(item as Listing).year}</span>}
                                {"end_time" in item && (item as Auction).end_time && (
                                  <span>Cierra: {new Date((item as Auction).end_time).toLocaleString("es-MX", { dateStyle: "short", timeStyle: "short" })}</span>
                                )}
                                <span className="text-sand/30">ID #{item.id}</span>
                              </div>
                            </div>
                            <div className="text-right shrink-0">
                              {"price" in item ? (
                                <p className="text-base font-semibold text-ember">{formatPrice((item as Listing).price)}</p>
                              ) : (
                                <div>
                                  <p className="text-xs text-sand/50">Puja actual</p>
                                  <p className="text-base font-semibold text-ember">{formatPrice((item as Auction).current_bid)}</p>
                                  {(item as Auction).min_bid_increment && (
                                    <p className="text-[10px] text-sand/40">+${((item as Auction).min_bid_increment || 0).toLocaleString()} MXN</p>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>

                          <p className="text-xs text-sand/40 line-clamp-1">{item.description}</p>

                          <div className="flex flex-wrap gap-2">
                            <button
                              className="rounded-xl border border-sand/20 px-3 py-1.5 text-xs text-sand/60 transition hover:text-sand hover:border-sand/40"
                              onClick={() => {
                                setForm({ ...item });
                                setTimeout(() => formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
                              }}
                            >
                              Editar
                            </button>

                            {/* Quick status toggle */}
                            {item.status === "active" && (
                              <button
                                className="rounded-xl border border-orange-500/30 px-3 py-1.5 text-xs text-orange-400 transition hover:bg-orange-500/10"
                                onClick={() => handleQuickStatus(item.id, "paused")}
                              >
                                Pausar
                              </button>
                            )}
                            {item.status === "paused" && (
                              <button
                                className="rounded-xl border border-cyan/30 px-3 py-1.5 text-xs text-cyan transition hover:bg-cyan/10"
                                onClick={() => handleQuickStatus(item.id, "active")}
                              >
                                Activar
                              </button>
                            )}
                            {(item.status === "draft" || item.status === "scheduled") && (
                              <button
                                className="rounded-xl border border-cyan/30 px-3 py-1.5 text-xs text-cyan transition hover:bg-cyan/10"
                                onClick={() => handleQuickStatus(item.id, "active")}
                              >
                                Publicar
                              </button>
                            )}

                            {mode === "auctions" && (
                              <button
                                className="rounded-xl border border-sand/30 px-3 py-1.5 text-xs text-sand/60 transition hover:text-sand"
                                onClick={() => toggleEnrollments(item.id)}
                              >
                                Inscripciones {expandedEnrollments.has(item.id) ? "▲" : "▼"}
                                {pendingCount > 0 && <span className="ml-1 text-yellow-400">({pendingCount})</span>}
                              </button>
                            )}

                            {mode === "listings" && item.status === "active" && (
                              <button
                                className="rounded-xl border border-cyan/30 px-3 py-1.5 text-xs text-cyan transition hover:bg-cyan/10"
                                onClick={() => {
                                  setShowConvertModal(item as Listing);
                                  setConvertForm({ reserve_price: (item as Listing).price, end_time: "" });
                                }}
                              >
                                Crear subasta
                              </button>
                            )}

                            <button
                              className="rounded-xl bg-ember/20 px-3 py-1.5 text-xs text-ember transition hover:bg-ember/30"
                              onClick={() => setDeleteTarget({ id: item.id, title: item.title })}
                            >
                              Eliminar
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Enrollment panel */}
                      {mode === "auctions" && expandedEnrollments.has(item.id) && (
                        <div className="rounded-xl border border-sand/10 bg-graphite/40 p-4 space-y-3">
                          <div className="flex items-center justify-between">
                            <p className="text-xs uppercase tracking-[0.3em] text-sand/50">Inscripciones</p>
                            <button className="text-xs text-sand/40 hover:text-sand" onClick={() => fetchEnrollments(item.id)}>Recargar</button>
                          </div>
                          {(enrollments[item.id] || []).length === 0 ? (
                            <p className="text-xs text-sand/40">No hay inscripciones.</p>
                          ) : (
                            <div className="grid gap-2">
                              {(enrollments[item.id] || []).map((e) => (
                                <div key={e.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-graphite/60 px-3 py-2">
                                  <div>
                                    <p className="text-sm text-sand">{e.business_name || e.email}</p>
                                    <p className="text-xs text-sand/50">{e.email} | Tier: {e.guarantee_tier || "—"}</p>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <StatusBadge status={e.status} />
                                    {e.status === "pending" && (
                                      <>
                                        <button className="rounded-lg bg-cyan/20 px-2 py-1 text-xs text-cyan transition hover:bg-cyan/30" onClick={() => handleEnrollmentAction(item.id, e.user_id, "approve")}>
                                          Aprobar
                                        </button>
                                        <button className="rounded-lg bg-ember/20 px-2 py-1 text-xs text-ember transition hover:bg-ember/30" onClick={() => handleEnrollmentAction(item.id, e.user_id, "reject")}>
                                          Rechazar
                                        </button>
                                      </>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
                {!loading && filteredItems.length === 0 && (
                  <div className="card text-center py-8">
                    <p className="text-sm text-sand/50">
                      {itemSearch || itemStatusFilter !== "all"
                        ? "Sin resultados para ese filtro."
                        : "No hay registros."}
                    </p>
                    {(itemSearch || itemStatusFilter !== "all") && (
                      <button className="mt-2 text-xs text-cyan hover:underline" onClick={() => { setItemSearch(""); setItemStatusFilter("all"); }}>
                        Limpiar filtros
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── Delete confirmation modal ───────────────────────────── */}
      {deleteTarget && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="glass w-full max-w-sm rounded-[24px] p-6 sm:rounded-[32px] sm:p-8">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-ember/10 mb-4">
              <svg className="h-6 w-6 text-ember" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-sand">Eliminar registro</h3>
            <p className="mt-2 text-sm text-sand/60">
              ¿Confirmas eliminar <span className="font-medium text-sand">&ldquo;{deleteTarget.title}&rdquo;</span>? Esta acción no se puede deshacer.
            </p>
            <div className="mt-6 flex gap-3">
              <button
                className="flex-1 rounded-xl bg-ember/20 px-4 py-2.5 text-sm font-semibold text-ember transition hover:bg-ember/30"
                onClick={confirmDelete}
                disabled={loading}
              >
                {loading ? "Eliminando..." : "Sí, eliminar"}
              </button>
              <button
                className="flex-1 rounded-xl border border-sand/20 px-4 py-2.5 text-sm text-sand/60 transition hover:text-sand"
                onClick={() => setDeleteTarget(null)}
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Password modal ──────────────────────────────────────── */}
      {passwordTarget && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="glass w-full max-w-lg rounded-[24px] p-6 sm:rounded-[32px] sm:p-8">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-sand/50">Usuarios</p>
                <h3 className="mt-2 text-xl font-semibold text-sand">Asignar contraseña</h3>
                <p className="mt-1 text-sm text-sand/60">{passwordTarget.business_name || passwordTarget.email}</p>
              </div>
              <button onClick={() => setPasswordTarget(null)} className="rounded-full bg-sand/10 p-2 text-sand/70 transition hover:text-sand" aria-label="Cerrar">
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <form onSubmit={handleSetPassword} className="mt-6 space-y-4">
              <FieldInput label="Contraseña temporal">
                <input type="password" className={inputCls} value={passwordForm.password} onChange={(e) => setPasswordForm((prev) => ({ ...prev, password: e.target.value }))} required />
              </FieldInput>
              <FieldInput label="Confirmar contraseña">
                <input type="password" className={inputCls} value={passwordForm.confirm} onChange={(e) => setPasswordForm((prev) => ({ ...prev, confirm: e.target.value }))} required />
              </FieldInput>
              <p className="text-xs text-sand/40">El usuario deberá cambiarla al iniciar sesión.</p>
              <button type="submit" className="button-primary w-full text-base" disabled={loading}>
                {loading ? "Guardando..." : "Asignar contraseña"}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ── Opportunities modal ─────────────────────────────────── */}
      {opportunitiesTarget && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="glass w-full max-w-sm rounded-[24px] p-6 sm:rounded-[32px] sm:p-8">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-sand/50">Oportunidades de puja</p>
                <h3 className="mt-2 text-xl font-semibold text-sand">Ajustar oportunidades</h3>
                <p className="mt-1 text-sm text-sand/60">{opportunitiesTarget.business_name || opportunitiesTarget.email}</p>
              </div>
              <button onClick={() => setOpportunitiesTarget(null)} className="rounded-full bg-sand/10 p-2 text-sand/70 transition hover:text-sand" aria-label="Cerrar">
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <form onSubmit={handleSetOpportunities} className="mt-6 space-y-4">
              <FieldInput label="Cantidad de oportunidades">
                <input type="number" className={inputCls} value={opportunitiesValue} onChange={(e) => setOpportunitiesValue(Number(e.target.value))} min={0} max={999} required />
              </FieldInput>
              <p className="text-xs text-sand/40">Actual: <span className="text-sand">{opportunitiesTarget.remaining_opportunities}</span></p>
              <button type="submit" className="button-primary w-full" disabled={loading}>
                {loading ? "Guardando..." : "Actualizar"}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ── Reject reason modal ─────────────────────────────────── */}
      {rejectTarget !== null && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="glass w-full max-w-md rounded-[24px] p-6 sm:rounded-[32px] sm:p-8">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-sand/50">Rechazar usuario</p>
                <h3 className="mt-2 text-xl font-semibold text-sand">Razón del rechazo</h3>
              </div>
              <button onClick={() => setRejectTarget(null)} className="rounded-full bg-sand/10 p-2 text-sand/70 transition hover:text-sand" aria-label="Cerrar">
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <form onSubmit={submitReject} className="mt-6 space-y-4">
              <FieldInput label="Motivo del rechazo">
                <textarea
                  className={`${inputCls} resize-none`}
                  rows={3}
                  required
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="Ej: Documentación incompleta, RFC no válido..."
                />
              </FieldInput>
              <div className="flex gap-3">
                <button type="submit" className="button-primary flex-1" disabled={loading || !rejectReason.trim()}>
                  {loading ? "Rechazando..." : "Confirmar rechazo"}
                </button>
                <button type="button" className="rounded-xl border border-sand/20 px-4 py-2 text-sm text-sand/60 transition hover:text-sand" onClick={() => setRejectTarget(null)}>
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Convert to auction modal ────────────────────────────── */}
      {showConvertModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-graphite/80 backdrop-blur-sm p-4">
          <div className="glass rounded-[24px] p-6 sm:p-8 max-w-md w-full space-y-4">
            <h3 className="text-lg font-semibold text-sand">Crear subasta</h3>
            <p className="text-sm text-sand/70">
              Se creará una subasta basada en &ldquo;{showConvertModal.title}&rdquo;.
              El producto seguirá disponible en venta directa.
            </p>
            <FieldInput label="Precio reserva (MXN)">
              <input type="number" className={inputCls} value={convertForm.reserve_price} onChange={(e) => setConvertForm((p) => ({ ...p, reserve_price: Number(e.target.value) }))} />
            </FieldInput>
            <FieldInput label="Fecha de cierre">
              <input type="datetime-local" className={inputCls} value={convertForm.end_time} onChange={(e) => setConvertForm((p) => ({ ...p, end_time: e.target.value }))} />
            </FieldInput>
            <div className="flex gap-3">
              <button className="button-primary flex-1" onClick={handleConvertToAuction} disabled={!convertForm.end_time || loading}>
                {loading ? <span className="flex items-center justify-center gap-2"><Spinner />Creando...</span> : "Crear subasta"}
              </button>
              <button className="rounded-xl border border-sand/20 px-4 py-2 text-sm text-sand/60 transition hover:text-sand" onClick={() => setShowConvertModal(null)}>
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Toast ───────────────────────────────────────────────── */}
      {toast && (
        <div className={`fixed bottom-6 right-4 z-[200] flex items-center gap-3 rounded-2xl px-4 py-3 shadow-xl transition-all sm:right-6 sm:px-5 ${
          toast.type === "error" ? "bg-ember text-white" : "bg-cyan/90 text-graphite"
        }`}>
          {toast.type === "error" ? (
            <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          ) : (
            <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          )}
          <p className="text-sm font-semibold">{toast.text}</p>
        </div>
      )}
    </main>
  );
}
