import { z } from "zod";

const schema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.url(),
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z.string().min(10),
  NEXT_PUBLIC_SITE_URL: z.url().default("http://localhost:3004"),
  PAYMENT_MODE: z.enum(["simulated", "live"]).default("simulated"),
});

let cached: z.infer<typeof schema> | null = null;

/** Valida as variáveis na primeira leitura; mensagem clara se faltar algo. */
export function env() {
  if (cached) return cached;
  const parsed = schema.safeParse({
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL || undefined,
    PAYMENT_MODE: process.env.PAYMENT_MODE || undefined,
  });
  if (!parsed.success) {
    const fields = parsed.error.issues.map((i) => i.path.join(".")).join(", ");
    throw new Error(`Variáveis de ambiente inválidas ou ausentes: ${fields}. Veja marketplace/.env.example.`);
  }
  cached = parsed.data;
  return cached;
}
