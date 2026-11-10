import Image from "next/image";

/**
 * DuaCincin WO mark: the original gold swan-and-rings logo (a collaboration with Kaloka).
 * Do not replace or redraw it; it is used as-is from /brand/duacincin-logo.webp (transparent,
 * works on paper and on ink). Next to it, the wordmark "DuaCincin" as real text.
 * `tone`: "dark" on paper (ink text), "light" on ink or photos.
 * When `withWordmark` is false, pass `label` so the link around it still has a name.
 */
export function BrandLogo({
  size = 28,
  tone = "dark",
  withWordmark = true,
  label,
  className = "",
  priority = false,
}: {
  size?: number;
  tone?: "dark" | "light";
  withWordmark?: boolean;
  label?: string;
  className?: string;
  priority?: boolean;
}) {
  const mark = Math.round(size * 1.15);
  return (
    <span className={`inline-flex items-center leading-none ${className}`} style={{ gap: size * 0.34 }}>
      <Image
        src="/brand/duacincin-logo.webp"
        alt=""
        width={mark}
        height={mark}
        priority={priority}
        className="shrink-0"
      />
      {withWordmark ? (
        <span
          className={`font-heading whitespace-nowrap ${tone === "light" ? "text-dc-on-dark" : "text-dc-ink"}`}
          style={{ fontSize: size * 0.95, fontWeight: 600, letterSpacing: "0.01em" }}
        >
          DuaCincin
        </span>
      ) : (
        label && <span className="sr-only">{label}</span>
      )}
    </span>
  );
}
