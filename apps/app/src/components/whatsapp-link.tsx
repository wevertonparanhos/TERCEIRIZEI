import type { ReactNode } from "react";
import { buildWhatsAppLink } from "@/lib/whatsapp";

export function WhatsAppLink({
  phone,
  message,
  className,
  children,
}: {
  phone: string | null | undefined;
  message?: string;
  className?: string;
  children: ReactNode;
}) {
  const href = buildWhatsAppLink(phone, message);
  if (!href) return null;

  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className={className}>
      {children}
    </a>
  );
}
