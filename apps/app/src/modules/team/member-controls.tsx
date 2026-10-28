"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { STAFF_ROLES, ROLE_LABELS } from "@/modules/team/permissions";

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
  activate: (userId: string, email: string) => Promise<{ inviteLink: string }>;
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
      const { inviteLink } = await activate(userId, email);
      window.prompt("Acesso ativado! Copie este link e envie para a pessoa criar a senha (Ctrl+C):", inviteLink);
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
