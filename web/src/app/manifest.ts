import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "DuaCincin",
    short_name: "DuaCincin",
    description: "Direktori vendor pernikahan terverifikasi, budget planner, dan Dana Aman (escrow).",
    lang: "id",
    start_url: "/",
    display: "standalone",
    background_color: "#f7f3ec",
    theme_color: "#f7f3ec",
    icons: [
      { src: "/icon.png", sizes: "192x192", type: "image/png" },
      { src: "/apple-icon.png", sizes: "180x180", type: "image/png" },
    ],
  };
}
