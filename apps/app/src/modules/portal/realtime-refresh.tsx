"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

/** Assina mudanças em uma tabela filtradas por coluna e recarrega os dados do
 * servidor quando algo muda — usado no portal para refletir ao vivo alterações
 * feitas pela equipe (mudança de etapa do processo, documento marcado recebido). */
export function RealtimeRefresh({
  table,
  filterColumn,
  filterValue,
}: {
  table: string;
  filterColumn: string;
  filterValue: string;
}) {
  const router = useRouter();

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    const channel = supabase
      .channel(`realtime-${table}-${filterValue}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table, filter: `${filterColumn}=eq.${filterValue}` },
        () => {
          router.refresh();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [table, filterColumn, filterValue, router]);

  return null;
}
