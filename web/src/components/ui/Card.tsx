// Hairline border, no shadow: elevation is reserved for floating layers
// (modal, dropdown, toast), see DESIGN.md.
export function Card({
  children,
  className = "",
  style,
}: {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <div style={style} className={`rounded-lg border border-dc-ink/10 bg-dc-white ${className}`}>
      {children}
    </div>
  );
}
