// The brand loader: two gold rings (the DuaCincin motif) and the wordmark.
// Each ring has a faint full track and a bright arc orbiting it, the two arcs
// turning in opposite directions. Pure CSS (globals.css "Loader"), so it runs
// in server HTML before hydration (the intro) and in the route curtain.
export function RingsLoader({ caption }: { caption?: string }) {
  return (
    <div className="flex flex-col items-center">
      <svg viewBox="0 0 120 72" className="dc-loader h-auto w-28 sm:w-32" aria-hidden>
        <circle className="dc-loader-track" cx="46" cy="36" r="26" />
        <circle className="dc-loader-track" cx="74" cy="36" r="26" />
        <circle className="dc-loader-arc" cx="46" cy="36" r="26" pathLength="100" />
        <circle className="dc-loader-arc dc-loader-arc-b" cx="74" cy="36" r="26" pathLength="100" />
      </svg>
      <p className="dc-loader-word mt-4 font-heading text-[2rem] leading-none text-dc-ink">
        Dua<span className="dc-em">Cincin</span>
      </p>
      {caption && <p className="dc-loader-word mt-3 text-sm text-dc-text-3">{caption}</p>}
    </div>
  );
}
