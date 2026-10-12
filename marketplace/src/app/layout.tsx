import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import { brand } from "@/lib/brand";
import "./globals.css";

const jakarta = Plus_Jakarta_Sans({ subsets: ["latin"], variable: "--font-jakarta", display: "swap" });

/** Todas as páginas dependem da sessão do usuário: renderização por requisição. */
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: { default: `${brand.name} — serviços para sua casa`, template: `%s · ${brand.name}` },
  description: brand.tagline,
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3004"),
};

export const viewport: Viewport = {
  themeColor: "#0d6b55",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={jakarta.variable}>
      <body className="min-h-dvh font-sans">{children}</body>
    </html>
  );
}
