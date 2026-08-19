import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Terceirizei | Consultoria e Gestão Empresarial",
  description: "Soluções inteligentes em legalização empresarial, gestão estratégica, BPO financeiro e terceirização operacional. Atendemos todo o Brasil. Mais de 6.500 processos de legalização por ano.",
  keywords: [
    "consultoria empresarial",
    "legalização de empresa",
    "BPO financeiro",
    "abertura de empresa",
    "gestão empresarial",
    "terceirização",
    "BPO legalização",
    "consultoria estratégica",
    "gestão de processos",
    "CNPJ",
    "alvará",
    "Belo Horizonte",
    "Minas Gerais",
    "Brasil",
  ],
  authors: [{ name: "Terceirizei Consultoria e Gestão Empresarial LTDA" }],
  creator: "Terceirizei",
  publisher: "Terceirizei",
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true },
  },
  openGraph: {
    type: "website",
    locale: "pt_BR",
    url: "https://terceirizei.com.br",
    siteName: "Terceirizei Consultoria e Gestão Empresarial",
    title: "Terceirizei | Consultoria e Gestão Empresarial",
    description: "Terceirizamos processos para sua empresa crescer com eficiência. Soluções em legalização, gestão estratégica e BPO.",
    images: [
      {
        url: "/images/logo.jpg",
        width: 1200,
        height: 630,
        alt: "Terceirizei Consultoria e Gestão Empresarial",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Terceirizei | Consultoria e Gestão Empresarial",
    description: "Terceirizamos processos para sua empresa crescer com eficiência.",
    images: ["/images/logo.jpg"],
  },
  icons: {
    icon: "/images/logo.jpg",
    apple: "/images/logo.jpg",
  },
  metadataBase: new URL("https://terceirizei.com.br"),
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR" className="scroll-smooth">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Montserrat:ital,wght@0,300;0,400;0,500;0,600;0,700;0,800;0,900;1,400&family=Inter:wght@300;400;500;600;700;800;900&display=swap"
          rel="stylesheet"
        />
        {/* Google Analytics placeholder */}
        {/* <script async src="https://www.googletagmanager.com/gtag/js?id=GA_MEASUREMENT_ID"></script> */}
        {/* Meta Pixel placeholder */}
        {/* <script>fbq('init', 'PIXEL_ID');</script> */}
      </head>
      <body className="bg-white text-[#1B2558] antialiased">{children}</body>
    </html>
  );
}
