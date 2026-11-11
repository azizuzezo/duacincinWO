"use client";

import { SCENES } from "@/components/landing/scenes";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Skeleton, SkeletonGroup } from "@/components/ui/Skeleton";
import { useToast } from "@/components/ui/Toast";

import { ArchScene } from "./InvitationPreview";
import { packageLabel, useInvitationLink } from "./useInvitationLink";

/**
 * "Undangan digital" card for the client dashboard / wedding planner.
 * Self-contained (loads its own status). Not linked: a glimpse of the
 * invitation (arch with a real painting and couple) and one action. Linked:
 * package, guests and RSVP counts and the editor.
 * Renders nothing while the feature is switched off on the server.
 */
export function InvitationCard({ className = "" }: { className?: string }) {
  const { state, open, opening } = useInvitationLink();
  const { show } = useToast();

  if (state.kind === "unavailable") return null;

  const handleOpen = async () => {
    const error = await open();
    if (error) show(error, "danger");
  };

  if (state.kind === "loading") {
    return (
      <Card className={`p-5 ${className}`}>
        <SkeletonGroup label="Memuat status undangan" className="flex flex-col gap-3">
          <Skeleton className="h-36 w-full rounded-lg" />
          <Skeleton className="h-6 w-3/4" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-11 w-full rounded-full" />
        </SkeletonGroup>
      </Card>
    );
  }

  if (state.kind === "error") {
    return (
      <Card className={`p-5 ${className}`}>
        <p className="dc-eyebrow mb-2">Undangan digital</p>
        <p className="font-heading text-2xl leading-tight text-dc-ink">Status undangan belum termuat</p>
        <p className="mt-1.5 text-sm leading-relaxed text-dc-text-2">{state.message}</p>
        <ButtonLink href="/client/undangan" variant="ghost" size="sm" className="mt-4">
          Buka halaman undangan
        </ButtonLink>
      </Card>
    );
  }

  const { status } = state;

  if (!status.linked) {
    return (
      <Card className={`overflow-hidden ${className}`}>
        <figure className="flex flex-col items-center bg-dc-cream px-6 pb-2 pt-6">
          <ArchScene scene={SCENES[0]} className="h-40 w-32 border border-dc-gold/50" sizes="128px" />
          <figcaption className="mt-2 text-[0.7rem] text-dc-text-3">
            {SCENES[0].credit.kind}: {SCENES[0].credit.author}, {SCENES[0].credit.license.toLowerCase()}
          </figcaption>
        </figure>
        <div className="p-5">
          <p className="dc-eyebrow mb-2">Undangan digital</p>
          <p className="font-heading text-[1.7rem] leading-tight text-dc-ink">
            Undangan dari data kalian, <em className="dc-em">tanpa ketik ulang</em>
          </p>
          <p className="mt-2 text-sm leading-relaxed text-dc-text-2">
            Tanggal, tempat, dan daftar tamu langsung terisi di DuaCincin Undangan. Tinggal pilih tema.
          </p>
          <div className="mt-4 flex flex-col gap-1">
            <Button variant="primary" size="sm" block loading={opening} onClick={handleOpen}>
              Buat undangan digital
            </Button>
            <ButtonLink href="/client/undangan" variant="quiet" size="sm" className="self-center">
              Lihat contohnya dulu
            </ButtonLink>
          </div>
        </div>
      </Card>
    );
  }

  const paid = !!status.package_type && status.package_type !== "demo";
  return (
    <Card className={`p-5 ${className}`}>
      <div className="flex items-start justify-between gap-3">
        <p className="dc-eyebrow">Undangan digital</p>
        <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold leading-5 ${paid ? "bg-dc-gold-soft text-dc-clay" : "bg-dc-cream text-dc-text-2"}`}>
          {packageLabel(status.package_type)}
        </span>
      </div>
      <p className="mt-2 font-heading text-[1.7rem] leading-tight text-dc-ink">
        Sudah <em className="dc-em">terhubung</em>
      </p>
      {status.url && <p className="mt-1 break-all text-sm text-dc-text-2">{status.url.replace(/^https?:\/\//, "")}</p>}
      <dl className="mt-4 grid grid-cols-3 divide-x divide-dc-line rounded-lg bg-dc-cream py-3 text-center">
        {[
          { label: "Tamu", value: status.guests },
          { label: "Hadir", value: status.rsvp.hadir },
          { label: "Ragu", value: status.rsvp.ragu },
        ].map((r) => (
          <div key={r.label} className="flex flex-col-reverse px-1">
            <dt className="mt-1 text-xs text-dc-text-2">{r.label}</dt>
            <dd className="font-heading text-[1.8rem] font-semibold leading-none text-dc-ink [font-variant-numeric:lining-nums_tabular-nums]">{r.value}</dd>
          </div>
        ))}
      </dl>
      <div className="mt-4 flex flex-col gap-1">
        <Button variant="primary" size="sm" block loading={opening} onClick={handleOpen}>
          Buka editor undangan
        </Button>
        <ButtonLink href="/client/undangan" variant="quiet" size="sm" className="self-center">
          Lihat RSVP lengkap
        </ButtonLink>
      </div>
    </Card>
  );
}
