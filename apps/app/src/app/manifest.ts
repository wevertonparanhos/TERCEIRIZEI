import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Terceirizei OS",
    short_name: "Terceirizei OS",
    description: "Plataforma de gestão de clientes, demandas, processos e financeiro da Terceirizei.",
    start_url: "/",
    display: "standalone",
    background_color: "#1B2558",
    theme_color: "#1B2558",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
