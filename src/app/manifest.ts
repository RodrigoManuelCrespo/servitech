import type { MetadataRoute } from "next";

// Manifest de la PWA: permite instalar ServiTech desde el navegador (celular,
// tablet o PC) y abrirla como app, sin la barra del navegador.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "ServiTech",
    short_name: "ServiTech",
    description: "Gestión de reparaciones técnicas",
    lang: "es",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#070b13",
    theme_color: "#070b13",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
