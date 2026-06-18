import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "WrenchReady Jeff",
    short_name: "Jeff",
    description: "WrenchReady field assistant for calls, photos, and field references.",
    start_url: "/jeff",
    scope: "/jeff",
    display: "standalone",
    background_color: "#08111f",
    theme_color: "#2563eb",
    orientation: "portrait",
    icons: [
      {
        src: "/wr-logo.png",
        sizes: "512x512",
        type: "image/png",
      },
      {
        src: "/apple-icon.png",
        sizes: "180x180",
        type: "image/png",
        purpose: "any",
      },
    ],
  };
}
