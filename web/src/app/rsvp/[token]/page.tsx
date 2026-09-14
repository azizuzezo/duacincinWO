"use client";

import { use, useEffect, useState } from "react";

import { Button } from "@/components/Button";
import { Footer } from "@/components/landing/Footer";
import { Navbar } from "@/components/landing/Navbar";
import { Card } from "@/components/ui/Card";
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

  return (
    <div className="flex min-h-screen flex-col bg-dc-offwhite">
      <Navbar />
      <main className="flex-1">
        <div className="mx-auto max-w-lg px-4 py-12">
          {loading ? (
            <p className="text-center text-dc-black/60">Memuat…</p>
          ) : notFound ? (
            <Card className="p-8 text-center">
              <p className="font-heading font-bold text-dc-navy">Link RSVP tidak ditemukan</p>
              <p className="mt-1 text-sm text-dc-black/60">Cek kembali link yang dibagikan ke kamu.</p>
            </Card>
          ) : submitted ? (
            <Card className="p-8 text-center">
              <p className="font-heading text-xl font-bold text-dc-navy">Terima kasih, {name}!</p>
              <p className="mt-2 text-dc-black/60">
                Konfirmasi kehadiranmu sudah kami terima{status === "attending" ? ", sampai jumpa di acaranya" : ""}.
              </p>
            </Card>
          ) : (
            <>
              <div className="mb-6 text-center">
                <h1 className="font-heading text-2xl font-extrabold text-dc-navy">{info?.event_name || "Konfirmasi Kehadiran"}</h1>
                {info?.event_date && (
                  <p className="mt-1 text-dc-black/60">
                    {new Date(info.event_date).toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
                  </p>
                )}
                {info?.venue_note && <p className="mt-1 text-sm text-dc-black/60">{info.venue_note}</p>}
              </div>

              <Card className="p-6 sm:p-8">
                <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label htmlFor="rsvp-name" className="text-sm font-medium text-dc-navy">
                      Nama
                    </label>
                    <input
                      id="rsvp-name"
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      required
                      className="w-full rounded-xl border border-dc-black/15 px-4 py-2.5 outline-none focus:border-dc-gold focus:ring-2 focus:ring-dc-gold/30"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex flex-col gap-1.5">
                      <label htmlFor="rsvp-phone" className="text-sm font-medium text-dc-navy">
                        No. Telepon (opsional)
                      </label>
                      <input
                        id="rsvp-phone"
                        type="text"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        className="w-full rounded-xl border border-dc-black/15 px-4 py-2.5 outline-none focus:border-dc-gold focus:ring-2 focus:ring-dc-gold/30"
                      />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label htmlFor="rsvp-party" className="text-sm font-medium text-dc-navy">
                        Jumlah Hadir
                      </label>
                      <input
                        id="rsvp-party"
                        type="number"
                        min={1}
                        value={partySize}
                        onChange={(e) => setPartySize(e.target.value)}
                        className="w-full rounded-xl border border-dc-black/15 px-4 py-2.5 outline-none focus:border-dc-gold focus:ring-2 focus:ring-dc-gold/30"
                      />
                    </div>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <span className="text-sm font-medium text-dc-navy">Konfirmasi Kehadiran</span>
                    <div className="flex gap-3">
                      <button
                        type="button"
                        onClick={() => setStatus("attending")}
                        className={`flex-1 rounded-xl border px-4 py-2.5 text-sm font-semibold transition ${
                          status === "attending" ? "border-dc-navy bg-dc-navy text-dc-white" : "border-dc-black/15 text-dc-navy"
                        }`}
                      >
                        Hadir
                      </button>
                      <button
                        type="button"
                        onClick={() => setStatus("not_attending")}
                        className={`flex-1 rounded-xl border px-4 py-2.5 text-sm font-semibold transition ${
                          status === "not_attending" ? "border-dc-navy bg-dc-navy text-dc-white" : "border-dc-black/15 text-dc-navy"
                        }`}
                      >
                        Tidak Hadir
                      </button>
                    </div>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label htmlFor="rsvp-message" className="text-sm font-medium text-dc-navy">
                      Ucapan/Pesan (opsional)
                    </label>
                    <textarea
                      id="rsvp-message"
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      rows={3}
                      className="w-full rounded-xl border border-dc-black/15 px-4 py-2.5 outline-none focus:border-dc-gold focus:ring-2 focus:ring-dc-gold/30"
                    />
                  </div>

                  {error && <p className="text-sm text-red-600">{error}</p>}
                  <Button type="submit" loading={saving}>
                    Kirim Konfirmasi
                  </Button>
                </form>
              </Card>
            </>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}
