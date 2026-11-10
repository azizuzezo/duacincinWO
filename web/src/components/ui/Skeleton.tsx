/** Loading placeholders that keep the final layout's shape (no layout shift).
 * Wrap a group in <SkeletonGroup label="Memuat booking"> so screen readers
 * hear one status instead of many empty boxes. */
export function Skeleton({ className = "" }: { className?: string }) {
  return <span aria-hidden className={`dc-skeleton block rounded-md ${className}`} />;
}

export function SkeletonText({ lines = 3, className = "" }: { lines?: number; className?: string }) {
  return (
    <span aria-hidden className={`flex flex-col gap-2 ${className}`}>
      {Array.from({ length: lines }, (_, i) => (
        <span key={i} className={`dc-skeleton block h-3.5 rounded-full ${i === lines - 1 ? "w-3/5" : "w-full"}`} />
      ))}
    </span>
  );
}

/** Shape of a VendorCard / photo card while loading. */
export function SkeletonCard({ className = "" }: { className?: string }) {
  return (
    <div aria-hidden className={`overflow-hidden rounded-xl border border-dc-line bg-dc-white ${className}`}>
      <span className="dc-skeleton block aspect-4/3" />
      <div className="flex flex-col gap-3 p-5">
        <span className="dc-skeleton block h-3 w-1/3 rounded-full" />
        <span className="dc-skeleton block h-6 w-3/4 rounded-full" />
        <span className="dc-skeleton block h-3 w-1/2 rounded-full" />
      </div>
    </div>
  );
}

export function SkeletonGroup({ label = "Memuat", className = "", children }: { label?: string; className?: string; children: React.ReactNode }) {
  return (
    <div role="status" aria-label={label} aria-busy="true" className={className}>
      {children}
    </div>
  );
}
