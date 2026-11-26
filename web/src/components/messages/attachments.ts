// Chat attachments: what can be sent, and how it gets to storage.
// Large files go straight from the browser to Cloudinary with a signature the
// API issues (a serverless request body is capped at a few MB). When the API
// has no Cloudinary configured it answers 503 and images fall back to the
// older upload through the API.
import { apiPost, apiPostForm, ApiError } from "@/lib/api";

export type AttachmentKind = "image" | "video" | "document";

const MB = 1024 * 1024;

const KIND_RULES: { kind: AttachmentKind; label: string; max: number; mimes: string[] }[] = [
  { kind: "image", label: "Foto", max: 15 * MB, mimes: ["image/jpeg", "image/png", "image/webp", "image/gif"] },
  { kind: "video", label: "Video", max: 100 * MB, mimes: ["video/mp4", "video/quicktime", "video/webm"] },
  {
    kind: "document",
    label: "Dokumen",
    max: 25 * MB,
    mimes: [
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/vnd.ms-excel",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "application/vnd.ms-powerpoint",
      "application/vnd.openxmlformats-officedocument.presentationml.presentation",
      "text/plain",
      "text/csv",
    ],
  },
];

/** Value for <input accept>. */
export const ATTACHMENT_ACCEPT = KIND_RULES.flatMap((r) => r.mimes).join(",") + ",.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv";

export function kindOfMime(mime?: string): AttachmentKind | null {
  if (!mime) return null;
  return KIND_RULES.find((r) => r.mimes.includes(mime))?.kind ?? null;
}

export function formatBytes(n?: number): string {
  if (!n) return "";
  if (n < 1024 * 1024) return `${Math.max(1, Math.round(n / 1024))} KB`;
  return `${(n / MB).toFixed(n < 10 * MB ? 1 : 0).replace(".", ",")} MB`;
}

/** Why a file cannot be sent, or null when it can. Mirrors the API's rules. */
export function checkFile(file: File): string | null {
  const kind = kindOfMime(file.type);
  if (!kind) return "Jenis file ini belum didukung. Kirim foto, video, PDF, Word, Excel, PowerPoint, atau teks.";
  const rule = KIND_RULES.find((r) => r.kind === kind)!;
  if (file.size > rule.max) return `Ukuran ${rule.label.toLowerCase()} maksimal ${Math.round(rule.max / MB)} MB.`;
  if (file.size === 0) return "File ini kosong.";
  return null;
}

export type UploadedAttachment = { url: string; type: string; name: string; size: number };

type SignResponse = { upload_url: string; fields: Record<string, string | number>; resource_type: string };

/** One upload with progress. Rejects with an ApiError carrying a readable message. */
export async function uploadAttachment(conversationId: string, file: File, onProgress: (fraction: number) => void, signal?: AbortSignal): Promise<UploadedAttachment> {
  let sign: SignResponse | null = null;
  try {
    sign = await apiPost<SignResponse>(`/api/v1/conversations/${conversationId}/attachments/sign`, { name: file.name, type: file.type, size: file.size });
  } catch (err) {
    // No Cloudinary on this server: images still go through the API.
    if (!(err instanceof ApiError && (err.status === 503 || err.status === 404)) || kindOfMime(file.type) !== "image") throw err;
  }

  if (!sign) {
    const form = new FormData();
    form.append("file", file);
    const up = await apiPostForm<{ url: string; type: string }>(`/api/v1/conversations/${conversationId}/attachments`, form);
    onProgress(1);
    return { url: up.url, type: up.type, name: file.name, size: file.size };
  }

  const form = new FormData();
  for (const [k, v] of Object.entries(sign.fields)) form.append(k, String(v));
  form.append("file", file);

  const url = await new Promise<string>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", sign.upload_url);
    xhr.upload.onprogress = (e) => e.lengthComputable && onProgress(e.loaded / e.total);
    xhr.onerror = () => reject(new ApiError(0, "Unggahan terputus. Periksa koneksimu lalu coba lagi."));
    xhr.onabort = () => reject(new ApiError(0, "Unggahan dibatalkan."));
    xhr.onload = () => {
      try {
        const body = JSON.parse(xhr.responseText);
        if (xhr.status >= 200 && xhr.status < 300 && body.secure_url) resolve(body.secure_url as string);
        else reject(new ApiError(xhr.status, body?.error?.message ?? "File belum bisa diunggah. Coba lagi."));
      } catch {
        reject(new ApiError(xhr.status, "File belum bisa diunggah. Coba lagi."));
      }
    };
    signal?.addEventListener("abort", () => xhr.abort());
    xhr.send(form);
  });
  return { url, type: file.type, name: file.name, size: file.size };
}
