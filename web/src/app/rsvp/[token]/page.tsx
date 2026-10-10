"use client";

import { use, useEffect, useState } from "react";

import { Button } from "@/components/Button";
import { Footer } from "@/components/landing/Footer";
import { Navbar } from "@/components/landing/Navbar";
import { apiPost, apiGet, ApiError, type RSVPInfo } from "@/lib/api";

export default function RSVPPage({ params }: PageProps<"/rsvp/[token]">) {
  const { token } = use(params);
  return <RSVPContent token={token} />;
}

function RSVPContent({ token }: { token: string }) {
  const [info, setInfo] = useState<RSVPInfo | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [partySize, setPartySize] = useState("1");
  const [status, setStatus] = useState<"attending" | "not_attending">("attending");
  const [message, setMessage] = useState("");

  useEffect(() => {
    apiGet<RSVPInfo>(`/api/v1/rsvp/${token}`)
      .then(setInfo)
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [token]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    setError(null);
    try {
      await apiPost(`/api/v1/rsvp/${token}/respond`, {
        name,
        phone,
        party_size: Number(partySize) || 1,
        status,
        message,
      });
      setSubmitted(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Gagal mengirim konfirmasi, coba lagi.");
    } finally {
      setSaving(false);
    }
  }

  const FIELD =
    "min-h-11 w-full rounded-md border border-dc-ink/20 bg-dc-white px-4 py-2.5 text-dc-black transition placeholder:text-dc-black/40 focus:border-dc-ink focus:outline-2 focus:outline-offset-2 focus:outline-dc-gold";
  const eventDate = info?.event_date
    ? new Date(info.event_date).toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" })
    : null;

  return (
    <div className="flex min-h-screen flex-col bg-dc-ivory">
      <Navbar />
      <main className="flex-1">
        <div className="mx-auto w-full max-w-xl px-4 py-12 sm:py-16">
          {loading ? (
            <div role="status" aria-label="Memuat undangan" className="flex flex-col items-center">
              <div className="h-3 w-32 animate-pulse rounded bg-dc-ink/10 motion-reduce:animate-none" />
              <div className="mt-6 h-12 w-3/4 animate-pulse rounded bg-dc-ink/10 motion-reduce:animate-none" />
              <div className="mt-10 h-72 w-full animate-pulse rounded-lg bg-dc-ink/10 motion-reduce:animate-none" />
            </div>
          ) : notFound ? (
            <div role="alert" className="rounded-lg border border-dc-ink/10 bg-dc-white p-10 text-center">
              <Rings />
              <p className="font-heading mt-6 text-3xl text-dc-ink">Undangan tidak ditemukan</p>
              <p className="mt-2 text-sm text-dc-black/70">Link ini tidak valid atau sudah tidak aktif. Cek kembali link yang dibagikan kepadamu.</p>
            </div>
          ) : submitted ? (
            <div role="status" className="rounded-lg border border-dc-ink/10 bg-dc-white p-10 text-center">
              <Rings />
              <p className="font-heading mt-6 text-4xl leading-tight text-dc-ink">
                Terima kasih, <span className="dc-em">{name}</span>
              </p>
              <div className="dc-rule mx-auto my-6 w-16" />
              <p className="text-dc-black/80">
                {status === "attending"
                  ? "Konfirmasi kehadiranmu sudah kami terima. Sampai jumpa di hari bahagia."
                  : "Konfirmasi kamu sudah kami terima. Terima kasih sudah memberi kabar."}
              </p>
            </div>
          ) : (
            <>
              <header className="text-center">
                <div className="flex justify-center">
                  <Rings />
                </div>
                <p className="mt-6 text-xs font-semibold uppercase tracking-[0.22em] text-dc-clay">Undangan pernikahan</p>
                <h1 className="font-heading mt-4 text-5xl leading-[1.05] text-dc-ink sm:text-6xl">
                  {info?.event_name || "Konfirmasi kehadiran"}
                </h1>
                <div className="dc-rule mx-auto my-6 w-16" />
                {eventDate && <p className="font-heading text-2xl text-dc-ink">{eventDate}</p>}
                {info?.venue_note && <p className="mt-2 text-sm text-dc-black/70">{info.venue_note}</p>}
                <p className="mx-auto mt-6 max-w-sm text-sm text-dc-black/70">
                  Mohon konfirmasi kehadiranmu lewat formulir di bawah agar kami bisa menyiapkan tempat untukmu.
                </p>
              </header>

              <form onSubmit={handleSubmit} className="mt-10 flex flex-col gap-5 rounded-lg border border-dc-ink/10 bg-dc-white p-6 sm:p-8">
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="rsvp-name" className="text-sm font-medium text-dc-ink">
                    Nama
                  </label>
                  <input id="rsvp-name" type="text" autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} required className={FIELD} />
                </div>

                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                  <div className="flex flex-col gap-1.5">
                    <label htmlFor="rsvp-phone" className="text-sm font-medium text-dc-ink">
                      No. telepon <span className="font-normal text-dc-black/60">(opsional)</span>
                    </label>
                    <input id="rsvp-phone" type="tel" autoComplete="tel" value={phone} onChange={(e) => setPhone(e.target.value)} className={FIELD} />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label htmlFor="rsvp-party" className="text-sm font-medium text-dc-ink">
                      Jumlah hadir
                    </label>
                    <input id="rsvp-party" type="number" min={1} value={partySize} onChange={(e) => setPartySize(e.target.value)} className={FIELD} />
                  </div>
                </div>

                <fieldset className="flex flex-col gap-1.5">
                  <legend className="mb-1.5 text-sm font-medium text-dc-ink">Konfirmasi kehadiran</legend>
                  <div role="radiogroup" className="grid grid-cols-2 gap-3">
                    {(
                      [
                        ["attending", "Hadir"],
                        ["not_attending", "Tidak hadir"],
                      ] as const
                    ).map(([value, label]) => (
                      <button
                        key={value}
                        type="button"
                        role="radio"
                        aria-checked={status === value}
                        onClick={() => setStatus(value)}
                        className={`min-h-11 rounded-md border px-4 py-2.5 text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-dc-gold ${
                          status === value
                            ? "border-dc-ink bg-dc-ink text-dc-white"
                            : "border-dc-ink/20 text-dc-ink hover:border-dc-ink"
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </fieldset>

                <div className="flex flex-col gap-1.5">
                  <label htmlFor="rsvp-message" className="text-sm font-medium text-dc-ink">
                    Ucapan atau pesan <span className="font-normal text-dc-black/60">(opsional)</span>
                  </label>
                  <textarea id="rsvp-message" value={message} onChange={(e) => setMessage(e.target.value)} rows={3} className={FIELD} />
                </div>

                {error && (
                  <p role="alert" className="text-sm text-red-700">
                    {error}
                  </p>
                )}
                <Button type="submit" loading={saving}>
                  Kirim konfirmasi
                </Button>
              </form>
            </>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}

// Identity motif: two interlocked rings, hairline only, static.
function Rings() {
  return (
    <svg width="56" height="32" viewBox="0 0 56 32" fill="none" aria-hidden="true" className="mx-auto">
      <circle cx="19" cy="16" r="13" stroke="#b8862f" strokeWidth="1" />
      <circle cx="37" cy="16" r="13" stroke="#b8862f" strokeWidth="1" />
    </svg>
  );
}
