"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { AdmHeader, ADM_FOCUS, ListSkeleton, SaveBar } from "@/components/admin/adm";
import { wdButton } from "@/components/home/ui";
import { ADMIN_NAV } from "@/components/shell/navConfig";
import { AdminShell } from "@/components/shell/AdminShell";
import { Input, Select } from "@/components/ui/Field";
import { useToast } from "@/components/ui/Toast";
import { WithUser } from "@/components/WithUser";
import { apiGet, apiPut, ApiError, type CurrentUser } from "@/lib/api";
import { ErrorBanner } from "../../_ui";

// Model Kirana: provider, model and API key of the landing AI assistant,
// editable here so switching needs no redeploy. Empty fields fall back to the
// AI_* environment variables. Changes reach every server within ~15 seconds.

type Settings = {
  base_url: string;
  model: string;
  reasoning_effort: string;
  key_set: boolean;
  key_hint: string;
};

const SARVAM_URL = "https://api.sarvam.ai/v2";
const SARVAM_MODELS = [
  "sarvam-105b",
  "sarvam-105b-conversations",
  "glm5.3",
  "glm5.3-flash",
  "gemma4",
  "deepseekv4.1-flash-1017",
  "deepseekv4.1-flash-1017-interactive",
  "deepseekv4-pro",
  "kimi-k3.1-pro",
  "qwen38-27b",
];

export default function AdminKiranaPage() {
  return (
    <WithUser allowedRoles={["admin"]} loginPath="/login">
      {(user) => <Content user={user} />}
    </WithUser>
  );
}

function Content({ user }: { user: CurrentUser }) {
  const toast = useToast();
  const [loaded, setLoaded] = useState<Settings | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [baseUrl, setBaseUrl] = useState("");
  const [model, setModel] = useState("");
  const [effort, setEffort] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  function reset(s: Settings) {
    setBaseUrl(s.base_url);
    setModel(s.model);
    setEffort(s.reasoning_effort);
    setApiKey("");
    setFormError(null);
  }

  const load = useCallback(async () => {
    setError(null);
    try {
      const s = await apiGet<Settings>("/api/v1/admin/ai-settings");
      setLoaded(s);
      setBaseUrl(s.base_url);
      setModel(s.model);
      setEffort(s.reasoning_effort);
      setApiKey("");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Gagal memuat pengaturan.");
    }
  }, []);

  const started = useRef(false);
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    queueMicrotask(load);
  }, [load]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setFormError(null);
    try {
      await apiPut("/api/v1/admin/ai-settings", { base_url: baseUrl, model, api_key: apiKey, reasoning_effort: effort });
      toast.show("Pengaturan Kirana tersimpan", "success");
      await load();
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : "Gagal menyimpan.");
    } finally {
      setBusy(false);
    }
  }

  const isSarvam = baseUrl.includes("sarvam.ai");
  const keyOk = apiKey.trim() !== "" || loaded?.key_set;
  const dirty = !!loaded && (baseUrl !== loaded.base_url || model !== loaded.model || effort !== loaded.reasoning_effort || apiKey !== "");

  return (
    <AdminShell tone="wd" user={user} navItems={ADMIN_NAV} loginPath="/login" eyebrow="Admin">
      <div className="wd-container pb-28 pt-8 sm:pt-10">
        <AdmHeader
          kicker="Sistem"
          title={
            <>
              Model <em>Kirana</em>
            </>
          }
          sub="Ganti provider dan model asisten AI tanpa membuka Vercel. Variabel AI_* di Vercel tidak dipakai lagi. Kirana nonaktif sampai Base URL, model, dan key terisi di sini. Perubahan aktif dalam sekitar 15 detik."
        />
        <div className="mt-10 max-w-2xl">
          {error && <ErrorBanner message={error} onRetry={load} />}
          {!loaded && !error && <ListSkeleton rows={4} label="Memuat pengaturan" />}
          {loaded && (
            <form id="kirana-form" onSubmit={save} noValidate>
              <section aria-labelledby="k-provider" className="pb-8">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <h2 id="k-provider" className="wd-title text-[1.2rem] leading-tight">
                    Provider
                  </h2>
                  <button type="button" onClick={() => setBaseUrl(SARVAM_URL)} className={`${wdButton({ variant: "outline", size: "sm" })} ${ADM_FOCUS}`}>
                    Pakai Sarvam
                  </button>
                </div>
                <p className="mt-1 text-sm leading-relaxed text-wd-text">Alamat API dan key yang dipakai Kirana.</p>
                <div className="mt-5 flex flex-col gap-4">
                  <Input
                    label="Base URL"
                    value={baseUrl}
                    onChange={(e) => setBaseUrl(e.target.value)}
                    placeholder={"https://api.provider.com/v1"}
                    hint="Tanpa /chat/completions. Contoh Sarvam: https://api.sarvam.ai/v2"
                    autoComplete="off"
                  />
                  <Input
                    label="API key"
                    type="password"
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    placeholder={loaded.key_set ? `Tersimpan (...${loaded.key_hint})` : ""}
                    hint="Isi hanya saat mengganti provider atau key. Kosong berarti key yang ada tidak diubah."
                    autoComplete="new-password"
                  />
                </div>
              </section>

              <section aria-labelledby="k-model" className="border-t border-wd-line py-8">
                <h2 id="k-model" className="wd-title text-[1.2rem] leading-tight">
                  Model
                </h2>
                <p className="mt-1 text-sm leading-relaxed text-wd-text">Nama model dan seberapa lama ia berpikir sebelum menjawab.</p>
                <div className="mt-5 flex flex-col gap-4">
                  <Input
                    label="Model"
                    value={model}
                    onChange={(e) => setModel(e.target.value)}
                    placeholder={"nama-model"}
                    list="kirana-models"
                    hint={isSarvam ? "Pilih dari daftar Sarvam atau ketik sendiri (huruf besar kecil berpengaruh)." : "Nama model persis seperti di provider."}
                    autoComplete="off"
                  />
                  <datalist id="kirana-models">
                    {SARVAM_MODELS.map((m) => (
                      <option key={m} value={m} />
                    ))}
                  </datalist>
                  <Select
                    label="Reasoning effort"
                    value={effort}
                    onChange={(e) => setEffort(e.target.value)}
                    hint="Makin rendah makin cepat. Model reasoning menghitung token berpikir ke dalam batas jawaban."
                  >
                    <option value="">Bawaan</option>
                    <option value="none">none</option>
                    <option value="low">low</option>
                    <option value="medium">medium</option>
                    <option value="high">high</option>
                    <option value="max">max</option>
                  </Select>
                </div>
              </section>

              {!keyOk && <p className="text-sm text-wd-danger">Belum ada API key. Isi key agar Kirana aktif.</p>}
              {formError && !dirty && (
                <p role="alert" className="text-sm font-medium text-wd-danger">
                  {formError}
                </p>
              )}
            </form>
          )}
        </div>
      </div>

      {dirty && loaded && <SaveBar note="Simpan supaya Kirana memakai pengaturan baru." error={formError} busy={busy} formId="kirana-form" onCancel={() => reset(loaded)} />}
    </AdminShell>
  );
}
