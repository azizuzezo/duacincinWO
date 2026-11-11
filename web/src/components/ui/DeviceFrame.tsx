import Image from "next/image";
import type { ReactNode } from "react";

// The one set of device frames for real WO screens (public/showcase/*), used on
// every marketing page. Drawn in CSS so they stay sharp and light.
//
// Phone: a modern phone (thin metallic edge, ink bezel, side buttons, dynamic
// island). The screen holds a real status bar row (time, signal, wifi,
// battery) with the island centred in it; the app capture starts BELOW that
// row, so no app UI ever sits under the island, and a home indicator floats at
// the bottom in its own safe-area strip. Every size is in container units (cqw), so the frame looks the
// same at 120px and at 400px wide. Spans only, so it can sit inside a button.
//
// Phone captures are the app viewport only, 390 x 792 CSS px (a 390 x 844
// phone minus its 52px status bar), stored at 640 x 1300. Laptop / browser
// captures are 1280 x 800.

/** App viewport of a phone capture (below the status bar). */
export const PHONE_CONTENT_RATIO = "390 / 792";
/** Outer box of a full (uncropped) PhoneFrame, to reserve space up front. */
export const PHONE_FRAME_RATIO = "100 / 214.5";

/** Top colour of the known captures, so the status bar continues the app's
 * own header: chat screens open on a white card header, the vendor sign-up
 * on a dark band; everything else on the ivory app bar. */
function captureTop(src?: string): { bar: string; dark: boolean } | null {
  if (!src) return null;
  if (/chat/.test(src)) return { bar: "bg-dc-white", dark: false };
  if (/v-daftar/.test(src)) return { bar: "bg-[#2a231d]", dark: true };
  return null;
}

const DEVICE_SHADOW_LIGHT = "shadow-float";
const DEVICE_SHADOW_DARK = "shadow-[0_40px_80px_-30px_rgba(0,0,0,0.85)]";

/** Brushed titanium edge: light catches the top-left and bottom-right. */
const METAL = "linear-gradient(145deg,#9c948a 0%,#4a443e 22%,#2a2622 50%,#4a443e 78%,#a39a8f 100%)";
const BUTTON_METAL = "linear-gradient(90deg,#3a342f,#8f877d 50%,#3a342f)";

type PhoneProps = {
  /** Capture to show. Pass `children` instead to render your own screen. */
  src?: string;
  alt?: string;
  children?: ReactNode;
  className?: string;
  sizes?: string;
  priority?: boolean;
  /** Visible app area ratio when cropping, e.g. "390 / 560": the phone is cut
   * off at the bottom with a fade (for inline thumbnails). */
  crop?: string;
  /** Gradient start class matching the surface under a cropped phone. */
  fade?: string;
  /** Status bar ink: "light" screen = dark icons, "dark" screen = white icons. */
  screen?: "light" | "dark";
  /** Status bar background class, matched to the top of the capture. */
  statusBg?: string;
  /** Section the phone sits on (sets the shadow strength). */
  surface?: "light" | "dark";
  /** Full-bleed page (e.g. an invitation cover): the capture fills the whole
   * screen (390 x 844) and the status bar floats over it, like a real
   * immersive page. Use with screen="dark" over photos. */
  immersive?: boolean;
};

export function PhoneFrame({
  src,
  alt = "",
  children,
  className = "",
  sizes = "300px",
  priority = false,
  crop,
  fade = "from-dc-ivory",
  screen: screenProp,
  statusBg,
  surface = "light",
  immersive = false,
}: PhoneProps) {
  const known = captureTop(src);
  const screen = screenProp ?? (known?.dark ? "dark" : "light");
  const topBg = statusBg ?? known?.bar;
  const ink = screen === "dark" ? "text-white" : "text-dc-ink";
  const bar = immersive ? "absolute inset-x-0 top-0 z-10 drop-shadow-[0_1px_2px_rgba(0,0,0,0.35)]" : (topBg ?? (screen === "dark" ? "bg-dc-ink" : "bg-dc-ivory"));
  return (
    <span className={`block @container ${className}`}>
      <span className="block relative">
        {/* Side buttons: action + volume on the left, power on the right. */}
        <span aria-hidden className="absolute -left-[0.9cqw] top-[17%] h-[5cqw] w-[1.2cqw] rounded-l-[0.6cqw]" style={{ background: BUTTON_METAL }} />
        <span aria-hidden className="absolute -left-[0.9cqw] top-[24.5%] h-[10cqw] w-[1.2cqw] rounded-l-[0.6cqw]" style={{ background: BUTTON_METAL }} />
        <span aria-hidden className="absolute -left-[0.9cqw] top-[31%] h-[10cqw] w-[1.2cqw] rounded-l-[0.6cqw]" style={{ background: BUTTON_METAL }} />
        <span aria-hidden className="absolute -right-[0.9cqw] top-[26%] h-[15cqw] w-[1.2cqw] rounded-r-[0.6cqw]" style={{ background: BUTTON_METAL }} />

        <span
          className={`block relative rounded-[15cqw] p-[0.9cqw] ${surface === "dark" ? DEVICE_SHADOW_DARK : DEVICE_SHADOW_LIGHT}`}
          style={{ background: METAL }}
        >
          <span className="block rounded-[14.1cqw] bg-[#0b0907] p-[2.5cqw]">
            <span className="block relative overflow-hidden rounded-[11.6cqw] bg-dc-ivory">
              {/* Status bar */}
              <span aria-hidden className={`${immersive ? "" : "relative "}flex h-[12.4cqw] items-center justify-between px-[8.5cqw] pt-[0.6cqw] ${bar} ${ink}`}>
                <span className="block w-[22cqw] text-center text-[3.9cqw] font-semibold leading-none tracking-[-0.01em] tabular-nums">9.41</span>
                <span className="absolute left-1/2 top-[2.4cqw] h-[8.4cqw] w-[28.5cqw] -translate-x-1/2 rounded-full bg-black" />
                <span className="flex w-[22cqw] items-center justify-center gap-[1.3cqw]">
                  <SignalIcon />
                  <WifiIcon />
                  <BatteryIcon dark={screen === "dark"} />
                </span>
              </span>
              {/* App viewport */}
              <span className="block relative bg-dc-ivory" style={{ aspectRatio: crop ?? (immersive ? "390 / 844" : PHONE_CONTENT_RATIO) }}>
                {children ?? (src ? <Image src={src} alt={alt} fill sizes={sizes} priority={priority} className="object-cover object-top" /> : null)}
                {crop ? <span aria-hidden className={`absolute inset-x-0 bottom-0 h-1/4 bg-linear-to-t ${fade} to-transparent`} /> : null}
              </span>
              {/* Home indicator in its own safe-area strip, as on a real phone,
                  so it never sits on the app's tab bar. */}
              {!crop && (
                <span aria-hidden className={`block h-[6cqw] ${immersive ? "absolute inset-x-0 bottom-0 z-10" : `relative ${screen === "dark" ? "bg-dc-ink" : "bg-dc-white"}`}`}>
                  <span className={`absolute bottom-[1.8cqw] left-1/2 h-[1.3cqw] w-[35%] -translate-x-1/2 rounded-full ${screen === "dark" || immersive ? "bg-white/85" : "bg-dc-ink/80"}`} />
                </span>
              )}
            </span>
          </span>
        </span>
      </span>
    </span>
  );
}

function SignalIcon() {
  return (
    <svg viewBox="0 0 18 12" className="h-auto w-[4.6cqw]" fill="currentColor">
      <rect x="0" y="8" width="3.2" height="4" rx="0.9" />
      <rect x="4.9" y="5.5" width="3.2" height="6.5" rx="0.9" />
      <rect x="9.8" y="3" width="3.2" height="9" rx="0.9" />
      <rect x="14.7" y="0" width="3.2" height="12" rx="0.9" />
    </svg>
  );
}

function WifiIcon() {
  return (
    <svg viewBox="0 0 16 12" className="h-auto w-[4.2cqw]" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round">
      <path d="M1.4 4.4a9.6 9.6 0 0 1 13.2 0" />
      <path d="M4.1 7.3a5.7 5.7 0 0 1 7.8 0" />
      <path d="M8 11.4 6.2 9.6a2.6 2.6 0 0 1 3.6 0Z" fill="currentColor" stroke="none" />
    </svg>
  );
}

function BatteryIcon({ dark }: { dark: boolean }) {
  return (
    <svg viewBox="0 0 27 13" className="h-auto w-[6.8cqw]">
      <rect x="0.6" y="0.6" width="22.8" height="11.8" rx="3.4" fill="none" stroke="currentColor" strokeOpacity={dark ? 0.45 : 0.4} strokeWidth="1.1" />
      <rect x="2.3" y="2.3" width="16.6" height="8.4" rx="2" fill="currentColor" />
      <path d="M25 4.5v4a2.2 2.2 0 0 0 0-4Z" fill="currentColor" fillOpacity={dark ? 0.5 : 0.45} />
    </svg>
  );
}

type ScreenProps = {
  src?: string;
  alt?: string;
  children?: ReactNode;
  className?: string;
  sizes?: string;
  priority?: boolean;
  surface?: "light" | "dark";
};

/** Laptop: thin ink bezel with a camera dot, 16:10 screen, aluminium base with
 * a thumb notch. The screen keeps the capture's own 16:10 ratio (no stretch). */
export function LaptopFrame({ src, alt = "", children, className = "", sizes = "(min-width: 1024px) 760px, 90vw", priority = false, surface = "light" }: ScreenProps) {
  return (
    <div className={`@container ${className}`}>
      <div className={`relative rounded-t-[2.2cqw] p-[0.25cqw] ${surface === "dark" ? DEVICE_SHADOW_DARK : DEVICE_SHADOW_LIGHT}`} style={{ background: METAL }}>
        <div className="relative rounded-t-[2cqw] bg-[#0b0907] px-[1.5cqw] pb-[2.4cqw] pt-[2.1cqw]">
          <span aria-hidden className="absolute left-1/2 top-[0.75cqw] h-[0.65cqw] w-[0.65cqw] -translate-x-1/2 rounded-full bg-[#2b2e33] ring-[0.15cqw] ring-[#15171a]" />
          <div className="relative aspect-[16/10] overflow-hidden rounded-[0.35cqw] bg-dc-ivory">
            {children ?? (src ? <Image src={src} alt={alt} fill sizes={sizes} priority={priority} className="object-cover object-top" /> : null)}
          </div>
        </div>
      </div>
      {/* Hinge + base */}
      <div aria-hidden className="relative mx-[-6.5%] h-[1.9cqw] rounded-b-[2.6cqw] shadow-[0_18px_30px_-14px_rgba(0,0,0,0.45)]" style={{ background: "linear-gradient(180deg,#d8d2c9 0%,#b9b1a6 45%,#8c847a 100%)" }}>
        <span className="absolute inset-x-0 top-0 h-[0.35cqw] bg-[#6f685f]/60" />
        <span className="absolute left-1/2 top-0 h-[0.9cqw] w-[15%] -translate-x-1/2 rounded-b-[1cqw] bg-[#a39b90]" />
      </div>
    </div>
  );
}

/** Desktop browser window (1280 x 800 captures). */
export function BrowserFrame({
  src,
  alt = "",
  className = "",
  sizes = "(min-width: 1024px) 760px, 100vw",
  priority = false,
  address = "duacincin.id",
}: {
  src: string;
  alt?: string;
  className?: string;
  sizes?: string;
  priority?: boolean;
  address?: string;
}) {
  return (
    <div className={`overflow-hidden rounded-xl border border-dc-line-strong bg-dc-white shadow-float ${className}`}>
      <div aria-hidden className="flex h-8 items-center gap-1.5 border-b border-dc-line bg-dc-cream px-3">
        <span className="h-2.5 w-2.5 rounded-full bg-dc-line-strong" />
        <span className="h-2.5 w-2.5 rounded-full bg-dc-line-strong" />
        <span className="h-2.5 w-2.5 rounded-full bg-dc-line-strong" />
        <span className="ml-3 hidden h-5 flex-1 items-center rounded-md bg-dc-white px-3 text-[11px] text-dc-text-3 sm:flex">{address}</span>
      </div>
      <div className="relative bg-dc-ivory" style={{ aspectRatio: "1280 / 800" }}>
        <Image src={src} alt={alt} fill sizes={sizes} priority={priority} className="object-cover object-top" />
      </div>
    </div>
  );
}
