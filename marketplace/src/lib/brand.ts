/** Nome comercial PROVISÓRIO — troque via NEXT_PUBLIC_BRAND_NAME sem mexer no código. */
export const brand = {
  name: process.env.NEXT_PUBLIC_BRAND_NAME || "Lar Pronto",
  tagline: "Serviços para sua casa, com preço claro antes de contratar.",
  supportEmail: process.env.NEXT_PUBLIC_SUPPORT_EMAIL || "",
} as const;
