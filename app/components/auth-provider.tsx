"use client";

import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from "react";
import PasswordChangeModal from "./password-change-modal";

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE ||
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  "http://localhost:8080";

export type User = {
  id: number;
  email: string;
  business_name: string;
  legal_representative: string;
  rfc: string;
  street_address: string;
  colony: string;
  municipality: string;
  postal_code: string;
  city: string;
  state: string;
  phone: string;
  mobile: string;
  status: "pending" | "approved" | "rejected";
  guarantee_tier: string;
  remaining_opportunities: number;
  rejection_reason: string;
  must_change_password: boolean;
  is_admin: boolean;
  created_at: string;
};

type AuthContextType = {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>;
  openPasswordModal: () => void;
};

export type RegisterData = {
  email: string;
  password: string;
  business_name: string;
  legal_representative: string;
  rfc: string;
  street_address: string;
  colony: string;
  municipality: string;
  postal_code: string;
  city: string;
  state: string;
  phone: string;
  mobile: string;
};

const AuthContext = createContext<AuthContextType>({
  user: null,
  token: null,
  loading: true,
  login: async () => {},
  register: async () => {},
  logout: () => {},
  refreshUser: async () => {},
  changePassword: async () => {},
  openPasswordModal: () => {},
});

export function useAuth() {
  return useContext(AuthContext);
}

export default function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [showPasswordModal, setShowPasswordModal] = useState(false);

  const refreshUser = useCallback(async () => {
    const stored = localStorage.getItem("maqzone_token");
    if (!stored) {
      setLoading(false);
      return;
    }
    try {
      const res = await fetch(`${API_BASE}/api/auth/me`, {
        headers: { Authorization: `Bearer ${stored}` },
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setUser(data);
      setToken(stored);
    } catch {
      localStorage.removeItem("maqzone_token");
      setUser(null);
      setToken(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshUser();
  }, [refreshUser]);

  const login = async (email: string, password: string) => {
    const res = await fetch(`${API_BASE}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Error al iniciar sesion");
    localStorage.setItem("maqzone_token", data.token);
    setToken(data.token);
    setUser(data.user);
    if (data.user?.must_change_password) setShowPasswordModal(true);
  };

  const register = async (regData: RegisterData) => {
    const res = await fetch(`${API_BASE}/api/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(regData),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Error al registrarse");
    localStorage.setItem("maqzone_token", data.token);
    setToken(data.token);
    setUser(data.user);
  };

  const logout = () => {
    localStorage.removeItem("maqzone_token");
    setUser(null);
    setToken(null);
  };

  const changePassword = async (currentPassword: string, newPassword: string) => {
    if (!token) throw new Error("No hay sesion activa.");
    const res = await fetch(`${API_BASE}/api/auth/password`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ current_password: currentPassword, new_password: newPassword }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "No se pudo cambiar la contrasena");
    setUser(data);
    setShowPasswordModal(false);
  };

  const openPasswordModal = () => setShowPasswordModal(true);
  const forcePasswordChange = Boolean(user?.must_change_password);

  return (
    <AuthContext.Provider value={{ user, token, loading, login, register, logout, refreshUser, changePassword, openPasswordModal }}>
      {children}
      {user && (
        <PasswordChangeModal
          open={showPasswordModal}
          forced={forcePasswordChange}
          onClose={() => { if (!forcePasswordChange) setShowPasswordModal(false); }}
          onSubmit={changePassword}
        />
      )}
    </AuthContext.Provider>
  );
}
