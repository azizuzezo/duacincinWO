import { ImageResponse } from "next/og";

export const alt = "DuaCincin: Rencanakan Pernikahanmu Bersama Vendor Tepercaya";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// Brand card shared by every page that does not set its own image
// (vendor profiles use their first portfolio photo instead).
export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "0 96px",
          background: "#f7f3ec",
          color: "#1a1613",
          borderLeft: "24px solid #b8862f",
        }}
      >
        <div style={{ fontSize: 120, fontWeight: 700, letterSpacing: -3, display: "flex" }}>
          Dua<span style={{ color: "#8c1d2f" }}>Cincin</span>
        </div>
        <div style={{ fontSize: 44, marginTop: 24, lineHeight: 1.3, maxWidth: 900, display: "flex" }}>
          Rencanakan pernikahanmu bersama vendor tepercaya
        </div>
        <div style={{ fontSize: 28, marginTop: 40, color: "#b8862f", display: "flex" }}>
          Vendor terverifikasi · Budget planner · Pembayaran escrow
        </div>
      </div>
    ),
    { ...size },
  );
}
