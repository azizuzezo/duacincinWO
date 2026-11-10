/**
 * Surface for grouped content. `tone`:
 * - card (default): warm card on paper, hairline + soft shadow (resting elevation).
 * - paper: champagne wash, no shadow, for nested groups inside a card.
 * - ink: dark block, at most one per screen, for the moment that deserves weight.
 * `interactive` adds hover lift for cards that are links or buttons.
 */
const TONES = {
  card: "border border-dc-line bg-dc-white shadow-soft",
  paper: "bg-dc-cream",
  ink: "dc-on-dark bg-dc-ink text-dc-on-dark",
} as const;

export function Card({
  children,
  className = "",
  style,
  tone = "card",
  interactive = false,
}: {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  tone?: keyof typeof TONES;
  interactive?: boolean;
}) {
  return (
    <div
      style={style}
      className={`rounded-xl ${TONES[tone]} ${
        interactive ? "transition-[transform,box-shadow,border-color] duration-500 ease-dc hover:border-dc-line-strong hover:shadow-lift motion-safe:hover:-translate-y-1 motion-safe:active:translate-y-0 motion-safe:active:scale-[0.99]" : ""
      } ${className}`}
    >
      {children}
    </div>
  );
}
