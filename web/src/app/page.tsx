import Image from "next/image";

export default function Page() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-6 px-6 py-24 text-center">
      <Image
        src="/brand/duacincin-logo.webp"
        alt="Logo DuaCincin"
        width={120}
        height={120}
        priority
      />
      <h1 className="font-heading text-3xl font-extrabold text-dc-navy sm:text-4xl">
        DuaCincin
      </h1>
      <p className="max-w-md text-dc-black/70">
        Fase 0 (setup proyek) selesai — frontend Next.js, backend Go, dan
        koneksi database sudah tersambung. Halaman ini akan digantikan oleh
        landing page penuh di Fase 2.
      </p>
    </main>
  );
}
