"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";

import { ClientShell } from "@/components/shell/ClientShell";
import { Button } from "@/components/ui/Button";
import { ErrorState } from "@/components/ui/ErrorState";
import { Skeleton, SkeletonGroup } from "@/components/ui/Skeleton";
import { WithUser } from "@/components/WithUser";
import { apiGet, apiPost, ApiError, formatRupiah, type CurrentUser } from "@/lib/api";

// Stand-in for the gateway's hosted payment page (Midtrans Snap / Xendit
// invoice) while no gateway is live. The Client picks a method and pays; the
// API then settles the order through the same path a real webhook uses.
// It only works while PAYMENT_PROVIDER is sandbox: otherwise the API answers 404.

type Order = { order_id: string; booking_id: string; type: "dp" | "full"; amount: number; status: "pending" | "paid" };

const METHODS = [
  { id: "va", label: "Transfer Virtual Account", hint: "BCA, BNI, Mandiri, BRI" },
  { id: "qris", label: "QRIS", hint: "Semua aplikasi bank dan e-wallet" },
  { id: "ewallet", label: "E-wallet", hint: "GoPay, OVO, DANA, ShopeePay" },
] as const;

export default function SandboxCheckoutPage() {
  return (
    <WithUser allowedRoles={["client"]} loginPath="/login">
      {(user) => (
        <Suspense>
          <Checkout user={user} />
        </Suspense>
      )}
    </WithUser>
  );
}

function Checkout({ user }: { user: CurrentUser }) {
  const router = useRouter();
  const orderId = useSearchParams().get("order") ?? "";
  const [order, setOrder] = useState<Order | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [method, setMethod] = useState<(typeof METHODS)[number]["id"]>("va");
  const [paying, setPaying] = useState(false);

  useEffect(() => {
    if (!orderId) {
      queueMicrotask(() => setError("Pesanan pembayaran tidak ditemukan."));
      return;
    }
    apiGet<Order>(`/api/v1/payments/sandbox/${encodeURIComponent(orderId)}`)
      .then(setOrder)
      .catch(() => setError("Pesanan pembayaran tidak ditemukan."));
  }, [orderId]);

  const back = order ? `/client/bookings/${order.booking_id}` : "/client/bookings";

  async function pay() {
    setPaying(true);
    setError(null);
    try {
      await new Promise((r) => setTimeout(r, 900)); // a real gateway takes a moment too
      await apiPost(`/api/v1/payments/sandbox/${encodeURIComponent(orderId)}/complete`, {});
      router.replace(`${back}?pembayaran=selesai`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Pembayaran gagal, coba lagi.");
      setPaying(false);
    }
  }

  return (
    <ClientShell user={user}>
      <div className="mx-auto w-full max-w-lg px-4 py-10 sm:py-14">
        {error && !order ? (
          <ErrorState title="Pembayaran tidak ditemukan" body={error} />
        ) : !order ? (
          <SkeletonGroup label="Memuat pembayaran">
            <Skeleton className="h-64 w-full rounded-2xl" />
          </SkeletonGroup>
        ) : (
          <div className="rounded-2xl border border-dc-line bg-white p-5 shadow-sm sm:p-7">
            <p className="inline-block rounded-full bg-dc-gold/15 px-3 py-1 text-xs font-semibold text-dc-ink">
              Mode uji coba: tidak ada uang yang ditagih
            </p>
            <h1 className="mt-4 text-xl font-semibold text-dc-ink">
              {order.type === "dp" ? "Bayar DP 30%" : "Bayar pelunasan"}
            </h1>
            <p className="mt-1 text-3xl font-semibold tabular-nums text-dc-ink">{formatRupiah(order.amount)}</p>

            {order.status === "paid" ? (
              <div className="mt-6">
                <p className="text-sm text-dc-text-2">Pesanan ini sudah dibayar.</p>
                <Button block className="mt-4" onClick={() => router.replace(back)}>
                  Kembali ke booking
                </Button>
              </div>
            ) : (
              <>
                <fieldset className="mt-6">
                  <legend className="text-sm font-semibold text-dc-ink">Metode pembayaran</legend>
                  <div className="mt-2 space-y-2">
                    {METHODS.map((m) => (
                      <label
                        key={m.id}
                        className="flex cursor-pointer items-center gap-3 rounded-xl border border-dc-line p-3 has-[:checked]:border-dc-gold has-[:checked]:bg-dc-gold/10 has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-dc-gold"
                      >
                        <input type="radio" name="method" checked={method === m.id} onChange={() => setMethod(m.id)} className="accent-dc-gold" />
                        <span>
                          <span className="block text-sm font-medium text-dc-ink">{m.label}</span>
                          <span className="block text-xs text-dc-text-3">{m.hint}</span>
                        </span>
                      </label>
                    ))}
                  </div>
                </fieldset>

                {error && (
                  <p role="alert" className="mt-4 text-sm text-red-700">
                    {error}
                  </p>
                )}

                <Button variant="gold" block className="mt-6" onClick={pay} loading={paying}>
                  Bayar {formatRupiah(order.amount)}
                </Button>
                <Button variant="ghost" block className="mt-2" onClick={() => router.push(back)} disabled={paying}>
                  Batal
                </Button>
              </>
            )}
          </div>
        )}
      </div>
    </ClientShell>
  );
}
