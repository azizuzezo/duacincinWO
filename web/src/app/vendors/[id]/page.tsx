"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { use, useEffect, useState } from "react";

import { Button } from "@/components/Button";
import { WithUser } from "@/components/WithUser";
import { apiGet, apiPost, ApiError, categoryLabel, formatRupiah, type Conversation, type VendorProfile } from "@/lib/api";

export default function VendorDetailPage({ params }: PageProps<"/vendors/[id]">) {
  const { id } = use(params);

  return (
    <WithUser allowedRoles={["client"]} loginPath="/client/login">
      {() => <VendorDetailContent id={id} />}
    </WithUser>
  );
}

function VendorDetailContent({ id }: { id: string }) {
  const router = useRouter();
  const [profile, setProfile] = useState<VendorProfile | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);

  useEffect(() => {
    apiGet<VendorProfile>(`/api/v1/vendors/${id}`)
      .then(setProfile)
      .catch((err) => setError(err instanceof ApiError ? err.message : "Vendor tidak ditemukan."));
  }, [id]);

  async function handleStartChat() {
    setStarting(true);
    try {
      const conv = await apiPost<Conversation>(`/api/v1/conversations/vendor/${id}`, {});
      router.push(`/client/messages/${conv.id}`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Gagal memulai chat.");
      setStarting(false);
    }
  }

  if (error) return <p className="mx-auto max-w-2xl px-4 py-10 text-red-600">{error}</p>;
  if (!profile) return <p className="mx-auto max-w-2xl px-4 py-10 text-dc-black/60">Memuat…</p>;

  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <p className="text-xs font-semibold uppercase tracking-wide text-dc-gold">{categoryLabel(profile.category)}</p>
      <h1 className="font-heading mt-1 text-2xl font-extrabold text-dc-navy sm:text-3xl">{profile.business_name}</h1>
      <p className="mt-1 text-dc-black/60">{profile.city}</p>
      <p className="mt-2 font-medium text-dc-navy">
        {formatRupiah(profile.price_min)} – {formatRupiah(profile.price_max)}
      </p>
      <p className="mt-4 whitespace-pre-line text-dc-black/80">{profile.description}</p>

      <Button className="mt-6 w-auto" onClick={handleStartChat} loading={starting}>
        Chat dengan Vendor Ini
      </Button>

      {profile.portfolio && profile.portfolio.length > 0 && (
        <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3">
          {profile.portfolio.map((p) => (
            <div key={p.id} className="relative aspect-square overflow-hidden rounded-xl bg-dc-offwhite">
              <Image src={p.url} alt={p.alt_text || "Portofolio vendor"} fill className="object-cover" unoptimized />
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
