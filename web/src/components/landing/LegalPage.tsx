import { Footer } from "@/components/landing/Footer";
import { Navbar } from "@/components/landing/Navbar";

/** Shared editorial shell for the legal documents. */
export function LegalPage({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-dc-ivory">
      <Navbar />
      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-12 sm:px-6 sm:py-16">
        <h1 className="font-heading text-4xl leading-[1.05] text-dc-ink sm:text-5xl">{title}</h1>
        <div className="dc-rule mt-5" />
        <p className="mt-5 rounded-lg border border-dc-ink/10 bg-dc-cream p-4 text-sm text-dc-ink">
          Draft awal untuk kebutuhan produk, bukan nasihat hukum. Wajib direview advokat sebelum mengikat pengguna nyata.
        </p>
        <div className="mt-8">{children}</div>
      </main>
      <Footer />
    </div>
  );
}
