"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { STAFF_ROLES, ROLE_LABELS } from "@/modules/team/permissions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

/** Seletor de papel do membro — salva ao escolher. */
export function RoleSelect({
  userId,
  current,
  disabled,
  changeRole,
}: {
  userId: string;
  current: string;
  disabled?: boolean;
  changeRole: (userId: string, role: string) => Promise<void>;
}) {
  const router = useRouter();
  const [value, setValue] = useState(current);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onChange(next: string) {
    const previous = value;
    setValue(next);
    setBusy(true);
    setError(null);
    try {
      await changeRole(userId, next);
      router.refresh();
    } catch (err) {
      setValue(previous);
      setError(err instanceof Error ? err.message : "Não foi possível alterar o papel.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <select
        value={value}
        disabled={disabled || busy}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-lg border border-border-strong bg-surface px-2.5 py-1.5 text-sm text-ink disabled:cursor-not-allowed disabled:opacity-60"
        aria-label="Papel do membro"
      >
        {STAFF_ROLES.map((r) => (
          <option key={r} value={r}>
            {ROLE_LABELS[r]}
          </option>
        ))}
      </select>
      {error && <p className="mt-1 max-w-[16rem] text-xs text-red-600">{error}</p>}
    </div>
  );
}

/** Remover (excluir) membro — pede confirmação e explica o que aconteceu. */
export function RemoveMemberButton({
  userId,
  name,
  remove,
}: {
  userId: string;
  name: string;
  remove: (userId: string) => Promise<{ deleted: boolean }>;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function onClick() {
    if (
      !window.confirm(
        `Remover ${name} da equipe?\n\nEle sai das tarefas em que é responsável. Se já tiver comentários ou histórico no sistema, fica apenas desativado para o histórico continuar com o nome dele.`
      )
    )
      return;
    setBusy(true);
    setMessage(null);
    try {
      const { deleted } = await remove(userId);
      if (!deleted) window.alert(`${name} tem histórico no sistema e por isso ficou desativado (não foi apagado).`);
      router.refresh();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Não foi possível remover.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <span>
      <button type="button" onClick={onClick} disabled={busy} className="text-xs font-medium text-red-600 hover:underline disabled:opacity-60">
        {busy ? "Removendo..." : "Remover"}
      </button>
      {message && <span className="ml-2 text-xs text-red-600">{message}</span>}
    </span>
  );
}

/** Membro migrado do FreelaPRO: informa um e-mail real, ativa o acesso e mostra o link para criar a senha. */
export function ActivateMigratedButton({
  userId,
  name,
  activate,
}: {
  userId: string;
  name: string;
  activate: (userId: string, email: string) => Promise<{ inviteLink: string; emailed: boolean }>;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function onClick() {
    const email = window.prompt(`E-mail de ${name} para ativar o acesso:`);
    if (!email || !email.trim()) return;
    setBusy(true);
    setMessage(null);
    try {
      const { inviteLink, emailed } = await activate(userId, email);
      window.prompt(
        emailed
          ? "Acesso ativado e e-mail enviado! Se a pessoa não receber, copie este link e mande pelo WhatsApp (Ctrl+C):"
          : "Acesso ativado, mas o e-mail não pôde ser enviado. Copie este link e mande pelo WhatsApp (Ctrl+C):",
        inviteLink
      );
      router.refresh();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Não foi possível ativar.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <span>
      <button type="button" onClick={onClick} disabled={busy} className="text-xs font-medium text-accent hover:underline disabled:opacity-60">
        {busy ? "Ativando..." : "Ativar com e-mail"}
      </button>
      {message && <span className="ml-2 block max-w-[16rem] text-xs text-red-600">{message}</span>}
    </span>
  );
}

export function ReactivateButton({
  userId,
  reactivate,
}: {
  userId: string;
  reactivate: (userId: string) => Promise<void>;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function onClick() {
    setBusy(true);
    setMessage(null);
    try {
      await reactivate(userId);
      router.refresh();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Não foi possível reativar.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <span>
      <button type="button" onClick={onClick} disabled={busy} className="text-xs font-medium text-accent hover:underline disabled:opacity-60">
        {busy ? "Reativando..." : "Reativar"}
      </button>
      {message && <span className="ml-2 block max-w-[16rem] text-xs text-red-600">{message}</span>}
    </span>
  );
}

/** Reenviar convite e redefinir senha de um membro ativo (o link sempre aparece para copiar). */
export function StaffAccessControls({
  userId,
  email,
  sendAccess,
}: {
  userId: string;
  email: string;
  sendAccess: (userId: string, mode: "invite" | "reset", byEmail: boolean) => Promise<{ link: string; email: string; emailed: boolean }>;
}) {
  const [byEmail, setByEmail] = useState(true);
  const [busy, setBusy] = useState<null | "invite" | "reset">(null);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ kind: "invite" | "reset"; link: string; emailed: boolean | null } | null>(null);
  const [copied, setCopied] = useState(false);

  async function run(mode: "invite" | "reset") {
    setBusy(mode);
    setError(null);
    setCopied(false);
    try {
      const r = await sendAccess(userId, mode, byEmail);
      setResult({ kind: mode, link: r.link, emailed: byEmail ? r.emailed : null });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível gerar o link.");
    } finally {
      setBusy(null);
    }
  }

  async function copy() {
    if (!result) return;
    try {
      await navigator.clipboard.writeText(result.link);
      setCopied(true);
    } catch {
      setError("Não foi possível copiar. Selecione o link e copie manualmente.");
    }
  }

  return (
    <div className="rounded-2xl border border-border/70 bg-surface p-5 shadow-sm">
      <h2 className="text-base font-semibold text-ink">Acesso ao sistema</h2>
      <p className="mt-1 text-xs text-muted">Reenvie o convite ou gere um link para {email} criar uma senha nova. Gerar um novo link invalida o anterior.</p>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <Button type="button" size="sm" onClick={() => run("invite")} disabled={busy !== null}>
          {busy === "invite" ? "Gerando..." : "Reenviar convite"}
        </Button>
        <Button type="button" size="sm" variant="outline" onClick={() => run("reset")} disabled={busy !== null}>
          {busy === "reset" ? "Gerando..." : "Redefinir senha"}
        </Button>
        <label className="flex items-center gap-1.5 text-xs text-ink">
          <input type="checkbox" checked={byEmail} onChange={(e) => setByEmail(e.target.checked)} />
          Enviar por e-mail
        </label>
      </div>
      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
      {result && (
        <div className="mt-3 space-y-2 rounded-xl border border-border bg-surface-alt/50 p-3">
          <p className="text-xs font-medium text-ink">
            {result.kind === "invite" ? "Convite gerado." : "Link de redefinição gerado."}{" "}
            {result.emailed === true && <span className="text-emerald-700 dark:text-emerald-400">E-mail enviado para {email}.</span>}
            {result.emailed === false && <span className="text-amber-700 dark:text-amber-400">O e-mail não pôde ser enviado: copie o link abaixo e mande pelo WhatsApp.</span>}
          </p>
          <div className="flex items-center gap-2">
            <Input value={result.link} readOnly aria-label="Link de acesso" className="h-8 flex-1 bg-surface font-mono text-xs" onFocus={(e) => e.currentTarget.select()} />
            <Button type="button" variant="outline" size="sm" onClick={copy}>
              {copied ? "Copiado!" : "Copiar"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
