"use client";

// "Masuk dengan Google" for /login and /register (client). Google's own
// button is required by their branding rules, so it is rendered by Google
// Identity Services, loaded only on these pages. The whole block (button and
// divider) is hidden when NEXT_PUBLIC_GOOGLE_CLIENT_ID is not set, so nothing
// breaks before setup. The ID token goes to POST /api/v1/auth/google, which
// verifies it and signs in exactly like the email login. Same Google client
// as DuaCincin Invitation.

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { AgreementCheckbox } from "@/components/AgreementCheckbox";
import { Button } from "@/components/ui/Button";
import { apiPost, ApiError, type CurrentUser } from "@/lib/api";

import { DASHBOARD_BY_ROLE } from "./redirect";

const CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ?? "";
const GSI_SRC = "https://accounts.google.com/gsi/client";
// The server answers 428 when this Google email has no account yet and the
// Client ToS has not been accepted.
const TERMS_REQUIRED = 428;

type GsiButtonText = "signin_with" | "signup_with" | "continue_with";

type GoogleId = {
  initialize: (opts: Record<string, unknown>) => void;
  renderButton: (el: HTMLElement, opts: Record<string, unknown>) => void;
};

declare global {
  interface Window {
    google?: { accounts?: { id?: GoogleId } };
  }
}

let gsiPromise: Promise<void> | null = null;

function loadGsi(): Promise<void> {
  if (window.google?.accounts?.id) return Promise.resolve();
  if (!gsiPromise) {
    gsiPromise = new Promise<void>((resolve, reject) => {
      const s = document.createElement("script");
      s.src = GSI_SRC;
      s.async = true;
      s.defer = true;
      s.onload = () => resolve();
      s.onerror = () => {
        gsiPromise = null;
        s.remove();
        reject(new Error("gsi"));
      };
      document.head.appendChild(s);
    });
  }
  return gsiPromise;
}

export const googleSignInEnabled = CLIENT_ID !== "";

/** Reads the email from the ID token for display only (the server verifies it). */
function emailFromCredential(credential: string): string | null {
  try {
    const part = credential.split(".")[1] ?? "";
    const json = atob(part.replace(/-/g, "+").replace(/_/g, "/"));
    const email = (JSON.parse(json) as { email?: unknown }).email;
    return typeof email === "string" ? email : null;
  } catch {
    return null;
  }
}

function friendlyError(err: unknown): string {
  if (!(err instanceof ApiError)) return "Koneksi terputus. Periksa internet kamu, lalu coba lagi.";
  if (err.status === 401) return "Akun Google kamu belum bisa kami pastikan. Coba lagi, atau masuk dengan email.";
  if (err.status === 503) return "Masuk dengan Google sedang tidak tersedia. Silakan masuk dengan email.";
  if (err.status >= 500) return "Ada gangguan di sistem kami. Coba lagi sebentar lagi.";
  const msg = err.message.trim();
  return msg ? msg.charAt(0).toUpperCase() + msg.slice(1) + (/[.!?]$/.test(msg) ? "" : ".") : "Terjadi kesalahan, coba lagi.";
}

type Props = {
  /** Which Google button label to show. */
  text?: GsiButtonText;
  /** Register page: the Client ToS checkbox in the form is already ticked. */
  acceptTerms?: boolean;
  /** Which account a new Google email becomes. Existing accounts keep their role. */
  role?: "client" | "vendor";
};

export function GoogleSignIn({ text = "signin_with", acceptTerms = false, role = "client" }: Props) {
  const router = useRouter();
  const box = useRef<HTMLDivElement>(null);
  const [gsi, setGsi] = useState<"loading" | "ready" | "error">("loading");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Set when the server needs the Client ToS accepted before creating an account.
  const [pending, setPending] = useState<{ credential: string; email: string | null } | null>(null);
  const [consent, setConsent] = useState(false);

  // The GSI callback is registered once; it reads the latest props through refs.
  const acceptRef = useRef(acceptTerms);
  useEffect(() => {
    acceptRef.current = acceptTerms;
  }, [acceptTerms]);

  async function submit(credential: string, accept: boolean) {
    setBusy(true);
    setError(null);
    try {
      const user = await apiPost<CurrentUser>("/api/v1/auth/google", {
        credential,
        role,
        accept_terms: accept,
      });
      router.push(DASHBOARD_BY_ROLE[user.role]);
      // Keep the busy state: the page is navigating away.
    } catch (err) {
      setBusy(false);
      if (err instanceof ApiError && err.status === TERMS_REQUIRED) {
        setPending({ credential, email: emailFromCredential(credential) });
        setConsent(false);
        return;
      }
      setPending(null);
      setError(friendlyError(err));
    }
  }

  const submitRef = useRef(submit);
  useEffect(() => {
    submitRef.current = submit;
  });

  useEffect(() => {
    if (!CLIENT_ID) return undefined;
    let alive = true;
    let ro: ResizeObserver | null = null;
    loadGsi()
      .then(() => {
        const id = window.google?.accounts?.id;
        if (!alive || !box.current || !id) return;
        id.initialize({
          client_id: CLIENT_ID,
          callback: (r: { credential?: string }) => {
            if (r?.credential) void submitRef.current(r.credential, acceptRef.current);
          },
          ux_mode: "popup",
          auto_select: false,
          cancel_on_tap_outside: true,
          context: text === "signup_with" ? "signup" : "signin",
        });
        const render = () => {
          const el = box.current;
          if (!el) return;
          // Google caps the button at 400px; fill the form column up to that.
          const w = Math.max(200, Math.min(400, Math.floor(el.clientWidth)));
          el.innerHTML = "";
          id.renderButton(el, {
            type: "standard",
            theme: "outline",
            size: "large",
            shape: "pill",
            text,
            logo_alignment: "center",
            width: w,
            locale: "id",
          });
        };
        render();
        setGsi("ready");
        let last = box.current.clientWidth;
        ro = new ResizeObserver(() => {
          const now = box.current?.clientWidth ?? 0;
          if (Math.abs(now - last) > 24) {
            last = now;
            render();
          }
        });
        ro.observe(box.current);
      })
      .catch(() => {
        if (alive) setGsi("error");
      });
    return () => {
      alive = false;
      ro?.disconnect();
    };
  }, [text]);

  if (!CLIENT_ID) return null;

  return (
    <div className="flex flex-col gap-3">
      <div className="relative">
        {/* Reserved height keeps the form from jumping when Google's button arrives. */}
        <div
          ref={box}
          data-testid="google-button"
          aria-hidden={busy || pending ? true : undefined}
          className={`flex min-h-11 w-full justify-center transition-opacity duration-300 ${busy || pending ? "pointer-events-none opacity-40" : ""}`}
        />
        {gsi === "loading" && (
          <div aria-hidden className="absolute inset-0 animate-pulse rounded-full border border-dc-line bg-dc-white" />
        )}
        {busy && (
          <p
            role="status"
            className="absolute inset-0 flex items-center justify-center gap-2 rounded-full bg-dc-white/90 text-sm font-semibold text-dc-ink"
          >
            <span aria-hidden className="h-4 w-4 animate-spin rounded-full border-2 border-dc-gold border-t-transparent" />
            Menghubungkan akun Google...
          </p>
        )}
      </div>

      {gsi === "error" && (
        <p className="text-center text-sm text-dc-text-2">
          Tombol Google belum bisa dimuat. Periksa koneksi internet, atau pakai email di bawah.
        </p>
      )}

      {pending && (
        <div
          role="group"
          aria-labelledby="google-terms-title"
          className="flex flex-col gap-3 rounded-xl border border-dc-gold/60 bg-dc-cream/60 p-4"
        >
          <p id="google-terms-title" className="text-sm leading-relaxed text-dc-ink">
            {pending.email ? (
              <>
                <span className="font-semibold break-all">{pending.email}</span> belum punya akun DuaCincin.
              </>
            ) : (
              "Email Google ini belum punya akun DuaCincin."
            )}{" "}
            {role === "vendor"
              ? "Kami buatkan akun vendor setelah kamu menyetujui perjanjiannya. Data usaha bisa dilengkapi sesudahnya."
              : "Kami buatkan akun calon pengantin setelah kamu menyetujui ketentuannya."}
          </p>
          <AgreementCheckbox
            checked={consent}
            onChange={setConsent}
            href={role === "vendor" ? "/legal/vendor-agreement" : "/legal/client-tos"}
            label={role === "vendor" ? "Perjanjian Kemitraan Vendor DuaCincin" : "Ketentuan Layanan Client"}
          />
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button type="button" variant="ghost" onClick={() => setPending(null)}>
              Batal
            </Button>
            <Button type="button" disabled={!consent} loading={busy} onClick={() => void submit(pending.credential, true)}>
              Buat akun dengan Google
            </Button>
          </div>
        </div>
      )}

      {error && (
        <p role="alert" className="text-center text-sm text-dc-danger">
          {error}
        </p>
      )}
    </div>
  );
}

/** "atau pakai email" divider between the Google button and the email form. */
export function AuthDivider({ label = "atau pakai email" }: { label?: string }) {
  if (!CLIENT_ID) return null;
  return (
    <div role="separator" aria-label={label} className="flex items-center gap-3 text-sm text-dc-text-2">
      <span aria-hidden className="h-px flex-1 bg-dc-line" />
      <span aria-hidden>{label}</span>
      <span aria-hidden className="h-px flex-1 bg-dc-line" />
    </div>
  );
}
