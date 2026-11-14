// Re-mounts on every navigation between top-level routes, so the new page's
// <main> plays its entrance (globals.css "dc-route-rise") as the route
// curtain lifts. Within a dashboard (/client/*) it does not re-mount.
export default function Template({ children }: { children: React.ReactNode }) {
  return <div className="dc-route-in flex flex-1 flex-col">{children}</div>;
}
