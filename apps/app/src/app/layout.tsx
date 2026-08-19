import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Terceirizei OS",
  description: "Plataforma de gestão de clientes, demandas, processos e financeiro da Terceirizei.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body className="font-sans">{children}</body>
    </html>
  );
}
