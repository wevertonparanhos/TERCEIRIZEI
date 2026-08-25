"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DeactivateButton } from "@/modules/team/deactivate-button";
import { ReactivatePortalButton } from "@/modules/clients/reactivate-portal-button";

type PortalUser = { id: string; email: string; active: boolean };

export function PortalAccessRow({
  clientId,
  defaultEmail,
  portalUser,
  invite,
  deactivate,
  reactivate,
}: {
  clientId: string;
  defaultEmail: string;
  portalUser: PortalUser | null;
  invite: (clientId: string, email: string) => Promise<{ inviteLink: string }>;
  deactivate: (userId: string) => Promise<void>;
  reactivate: (userId: string) => Promise<void>;
}) {
  const router = useRouter();
  const [email, setEmail] = useState(defaultEmail);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [inviteLink, setInviteLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  async function handleInvite() {
    setSubmitting(true);
    setError(null);
    try {
      const result = await invite(clientId, email);
      setInviteLink(result.inviteLink);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível criar o acesso.");
    } finally {
      setSubmitting(false);
    }
  }

  async function copyLink() {
    if (!inviteLink) return;
    await navigator.clipboard.writeText(inviteLink);
    setCopied(true);
  }

  // inviteLink tem prioridade sobre portalUser — mesmo motivo do PortalAccess
  // da tela do cliente: o router.refresh() já traz o usuário criado, e sem essa
  // checagem primeiro o link recém-gerado sumiria antes de dar tempo de copiar.
  if (inviteLink) {
    return (
      <div className="flex flex-col gap-2">
        <span className="text-xs font-medium text-emerald-700 dark:text-emerald-400">Acesso criado! Copie o link:</span>
        <div className="flex items-center gap-2">
          <Input value={inviteLink} readOnly className="h-8 flex-1 bg-surface font-mono text-xs" />
          <Button type="button" variant="outline" size="sm" onClick={copyLink}>
            {copied ? "Copiado!" : "Copiar"}
          </Button>
        </div>
      </div>
    );
  }

  if (portalUser) {
    return (
      <div className="flex items-center gap-3">
        <span className="text-sm text-ink">{portalUser.email}</span>
        <Badge variant={portalUser.active ? "success" : "neutral"}>
          {portalUser.active ? "Ativo" : "Desativado"}
        </Badge>
        {portalUser.active ? (
          <DeactivateButton userId={portalUser.id} deactivate={deactivate} />
        ) : (
          <ReactivatePortalButton userId={portalUser.id} reactivate={reactivate} />
        )}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <Input value={email} onChange={(e) => setEmail(e.target.value)} className="h-8 max-w-[220px]" />
      <Button type="button" size="sm" onClick={handleInvite} disabled={submitting}>
        {submitting ? "Criando..." : "Criar acesso"}
      </Button>
      {error && <span className="text-xs text-red-600">{error}</span>}
    </div>
  );
}
