import "server-only";
import { createSupabaseServerClient } from "@/lib/supabase/server";

// Camada de portabilidade (princípio 5 do briefing do LEGALIZA.AI): concentra
// as chamadas de sessão específicas do Supabase Auth aqui, em vez de espalhar
// createSupabaseServerClient() pela lógica de negócio — se o provedor de auth
// mudar no futuro, só este arquivo muda. StorageService/QueueService/
// NotificationService ficam para quando tiverem um consumidor real
// (Documentos, Notificações) — sem scaffolding prematuro.
export type AuthSession = {
  userId: string;
  email: string;
};

export async function getCurrentSession(): Promise<AuthSession | null> {
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || !user.email) return null;
  return { userId: user.id, email: user.email };
}

export async function signOutCurrentSession(): Promise<void> {
  const supabase = createSupabaseServerClient();
  await supabase.auth.signOut();
}
