"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DeactivateButton } from "@/modules/team/deactivate-button";
import { ReactivatePortalButton } from "@/modules/clients/reactivate-portal-button";

type PortalUser = { id: string; email: string; active: boolean };
type AccessResult = { link: string; email: string; emailed: boolean };

export function PortalAccessRow({
  clientId,
  defaultEmail,
  portalUser,
  invite,
  deactivate,
  reactivate,
  sendAccess,
}: {
  clientId: string;
  defaultEmail: string;
  portalUser: PortalUser | null;
  invite: (clientId: string, email: string) => Promise<{ inviteLink: string }>;
  deactivate: (userId: string) => Promise<void>;
  reactivate: (userId: string) => Promise<void>;
  /** gera um link novo (convite ou redefinição de senha) e, se pedido, envia por e-mail */
  sendAccess?: (clientId: string, mode: "invite" | "reset", byEmail: boolean) => Promise<AccessResult>;
}) {
  const router = useRouter();
  const [email, setEmail] = useState(defaultEmail);
  const [byEmail, setByEmail] = useState(true);
  const [busy, setBusy] = useState<null | "create" | "invite" | "reset">(null);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ kind: "created" | "invite" | "reset"; link: string; email: string; emailed: boolean | null } | null>(null);
  const [copied, setCopied] = useState(false);

  async function handleCreate() {
    setBusy("create");
    setError(null);
    try {
      const created = await invite(clientId, email);
      setResult({ kind: "created", link: created.inviteLink, email, emailed: null });
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível criar o acesso.");
    } finally {
      setBusy(null);
    }
  }

  async function handleSend(mode: "invite" | "reset") {
    if (!sendAccess) return;
    setBusy(mode);
    setError(null);
    setCopied(false);
    try {
      const r = await sendAccess(clientId, mode, byEmail);
      setResult({ kind: mode, link: r.link, email: r.email, emailed: byEmail ? r.emailed : null });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível gerar o link.");
    } finally {
      setBusy(null);
    }
  }

  async function sendCreatedByEmail() {
    if (!result) return;
    await handleSend("invite");
  }

  async function copyLink() {
    if (!result) return;
    try {
      await navigator.clipboard.writeText(result.link);
      setCopied(true);
    } catch {
      setError("Não foi possível copiar. Selecione o link e copie manualmente.");
    }
  }

  const resultBox = result && (
    <div className="mt-3 space-y-2 rounded-xl border border-border bg-surface-alt/50 p-3">
      <p className="text-xs font-medium text-ink">
        {result.kind === "created" ? "Acesso criado." : result.kind === "invite" ? "Convite gerado." : "Link de redefinição gerado."}{" "}
        {result.emailed === true && <span className="text-emerald-700 dark:text-emerald-400">E-mail enviado para {result.email}.</span>}
        {result.emailed === false && <span className="text-amber-700 dark:text-amber-400">O e-mail não pôde ser enviado: copie o link abaixo e mande pelo WhatsApp.</span>}
        {result.emailed === null && result.kind === "created" && <span className="text-muted">Envie o link ao cliente (e-mail ou WhatsApp).</span>}
      </p>
      <div className="flex items-center gap-2">
        <Input value={result.link} readOnly aria-label="Link de acesso" className="h-8 flex-1 bg-surface font-mono text-xs" onFocus={(e) => e.currentTarget.select()} />
        <Button type="button" variant="outline" size="sm" onClick={copyLink}>
          {copied ? "Copiado!" : "Copiar"}
        </Button>
        {result.kind === "created" && sendAccess && (
          <Button type="button" size="sm" onClick={sendCreatedByEmail} disabled={busy !== null}>
            {busy === "invite" ? "Enviando..." : "Enviar por e-mail"}
          </Button>
        )}
      </div>
      <p className="text-[11px] text-muted-soft">O link abre uma página para o cliente criar a própria senha. Gerar um novo link invalida o anterior.</p>
    </div>
  );

  if (portalUser) {
    return (
      <div>
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-sm text-ink">{portalUser.email}</span>
          <Badge variant={portalUser.active ? "success" : "neutral"}>{portalUser.active ? "Ativo" : "Desativado"}</Badge>
          {portalUser.active ? <DeactivateButton userId={portalUser.id} deactivate={deactivate} /> : <ReactivatePortalButton userId={portalUser.id} reactivate={reactivate} />}
        </div>

        {portalUser.active && sendAccess && (
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <Button type="button" size="sm" onClick={() => handleSend("invite")} disabled={busy !== null}>
              {busy === "invite" ? "Gerando..." : "Enviar convite"}
            </Button>
            <Button type="button" size="sm" variant="outline" onClick={() => handleSend("reset")} disabled={busy !== null}>
              {busy === "reset" ? "Gerando..." : "Redefinir senha"}
            </Button>
            <label className="flex items-center gap-1.5 text-xs text-ink">
              <input type="checkbox" checked={byEmail} onChange={(e) => setByEmail(e.target.checked)} />
              Enviar por e-mail ao cliente
            </label>
          </div>
        )}
        {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
        {resultBox}
      </div>
    );
  }

  if (result?.kind === "created") {
    return (
      <div>
        {resultBox}
        {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Input value={email} onChange={(e) => setEmail(e.target.value)} aria-label="E-mail do cliente" placeholder="E-mail do cliente" className="h-8 max-w-[240px]" />
      <Button type="button" size="sm" onClick={handleCreate} disabled={busy !== null || !email.trim()}>
        {busy === "create" ? "Criando..." : "Criar acesso"}
      </Button>
      {error && <span className="text-xs text-red-600">{error}</span>}
    </div>
  );
}
