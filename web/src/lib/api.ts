const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080";

export class ApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...init?.headers,
    },
  });

  const isJson = res.headers.get("content-type")?.includes("application/json");
  const body = isJson ? await res.json() : undefined;

  if (!res.ok) {
    throw new ApiError(res.status, body?.error ?? "Terjadi kesalahan, coba lagi.");
  }

  return body as T;
}

export function apiPost<T>(path: string, data: unknown): Promise<T> {
  return request<T>(path, { method: "POST", body: JSON.stringify(data) });
}

export function apiPut<T>(path: string, data: unknown): Promise<T> {
  return request<T>(path, { method: "PUT", body: JSON.stringify(data) });
}

export function apiGet<T>(path: string): Promise<T> {
  return request<T>(path, { method: "GET" });
}

// For multipart/form-data uploads — no Content-Type override, the browser
// sets it (with the correct boundary) from the FormData body itself.
export async function apiPostForm<T>(path: string, form: FormData): Promise<T> {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    method: "POST",
    credentials: "include",
    body: form,
  });

  const isJson = res.headers.get("content-type")?.includes("application/json");
  const body = isJson ? await res.json() : undefined;

  if (!res.ok) {
    throw new ApiError(res.status, body?.error ?? "Terjadi kesalahan, coba lagi.");
  }

  return body as T;
}

export type CurrentUser = {
  id: string;
  email: string;
  role: "client" | "vendor" | "admin" | "wedding_consultant";
  full_name: string;
};

export const VENDOR_CATEGORIES: { value: string; label: string }[] = [
  { value: "venue", label: "Venue" },
  { value: "catering", label: "Catering" },
  { value: "decor", label: "Dekorasi" },
  { value: "mua_attire", label: "MUA & Attire" },
  { value: "photo_video", label: "Foto & Video" },
  { value: "entertainment", label: "Entertainment" },
  { value: "invitation_souvenir", label: "Undangan & Souvenir" },
];

export function categoryLabel(value: string): string {
  return VENDOR_CATEGORIES.find((c) => c.value === value)?.label ?? value;
}

export function formatRupiah(value: number): string {
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(
    value,
  );
}

export type VendorProfile = {
  user_id: string;
  business_name: string;
  category: string;
  city: string;
  price_min: number;
  price_max: number;
  description: string;
  status: "pending" | "approved" | "rejected";
  rejection_reason?: string;
  portfolio?: { id: string; url: string; alt_text: string }[];
};

export type DirectoryCard = {
  id: string;
  category: string;
  city: string;
  price_min: number;
  price_max: number;
  sample_image?: string;
};

export type Conversation = {
  id: string;
  type: "vendor_chat" | "consultation";
  client_id: string;
  vendor_id?: string;
};

export type ChatMessage = {
  id: string;
  sender_id: string;
  body: string;
  flagged: boolean;
  created_at: string;
};

export type BudgetCategoryDTO = {
  category: string;
  percentage: number;
  amount: number;
};

export type BudgetPlan = {
  total_budget: number;
  guest_count: number;
  categories: BudgetCategoryDTO[];
};
