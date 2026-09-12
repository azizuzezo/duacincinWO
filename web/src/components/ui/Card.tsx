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
    <div style={style} className={`rounded-2xl bg-dc-white shadow-md shadow-dc-navy/[0.06] ${className}`}>
      {children}
    </div>
  );
}
