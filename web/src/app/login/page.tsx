"use client";

// Login in the "Putih" system: shared split layout (components/home/auth).
// One page for couples, vendors and the internal team; the server decides
// where each role lands (afterLogin). Google sign-in shows only when
// configured. The page holds exactly one <form> (e2e/lib/browser.mjs submits it).
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { GoogleSignIn } from "@/components/auth/GoogleSignIn";
import { afterLogin, nextFromLocation } from "@/components/auth/redirect";
import { AUTH_LINK, AuthError, AuthField, AuthLayout, AuthOr, AuthPassword, AuthSubmit, useFocusOnError } from "@/components/home/auth";
import { apiPost, ApiError, type CurrentUser } from "@/lib/api";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [registerHref, setRegisterHref] = useState("/register");
  const errorRef = useFocusOnError(error);

  useEffect(() => {
    const next = nextFromLocation();
    // eslint-disable-next-line react-hooks/set-state-in-effect -- read the address once in the browser
    if (next) setRegisterHref(`/register?role=client&next=${encodeURIComponent(next)}`);
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const user = await apiPost<CurrentUser>("/api/v1/auth/login", { email, password });
      router.push(afterLogin(user.role));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Terjadi kesalahan, coba lagi.");
    } finally {
      setLoading(false);
    }
  }

  const describedBy = error ? "login-galat" : undefined;

  return (
    <AuthLayout
      title={
        <>
          Selamat datang <em>kembali</em>
        </>
      }
      sub="Masuk untuk melanjutkan rencana pernikahanmu. Vendor dan tim DuaCincin juga masuk di sini."
      footer={
        <>
          Belum punya akun?{" "}
          <Link href={registerHref} className={AUTH_LINK}>
            Daftar gratis
          </Link>
        </>
      }
    >
      <div className="empty:hidden">
        <GoogleSignIn text="signin_with" />
      </div>
      <AuthOr />
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <AuthField label="Email" name="email" type="email" autoComplete="username" spellCheck={false} value={email} onChange={setEmail} invalid={!!error} describedBy={describedBy} />
        <AuthPassword label="Password" autoComplete="current-password" value={password} onChange={setPassword} invalid={!!error} describedBy={describedBy} />
        <div className="-mt-1 flex justify-end">
          <Link href="/forgot-password" className="inline-flex min-h-10 items-center text-sm font-medium text-wd-accent-ink underline-offset-4 hover:underline">
            Lupa password?
          </Link>
        </div>
        {error && (
          <AuthError id="login-galat" ref={errorRef}>
            {error}
          </AuthError>
        )}
        <AuthSubmit loading={loading}>Masuk</AuthSubmit>
      </form>

      <p className="mt-6 text-center text-sm text-wd-muted">
        Punya usaha pernikahan?{" "}
        <Link href="/register?role=vendor" className={AUTH_LINK}>
          Daftar sebagai vendor
        </Link>
      </p>
    </AuthLayout>
  );
}
