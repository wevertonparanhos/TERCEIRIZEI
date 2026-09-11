"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { inviteClientPortalUser } from "@/modules/clients/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type PortalUser = { name: string; email: string };

export function PortalAccess({ clientId, portalUser }: { clientId: string; portalUser: PortalUser | null }) {
  const [serverError, setServerError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [created, setCreated] = useState<{ email: string; temporaryPassword: string } | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<{ name: string; email: string }>();

  async function submit(data: { name: string; email: string }) {
    setServerError(null);
    setSubmitting(true);
    try {
      const result = await inviteClientPortalUser(clientId, data);
      setCreated(result);
    } catch (err) {
      setServerError(err instanceof Error ? err.message : "Não foi possível criar o acesso.");
    } finally {
      setSubmitting(false);
    }
  }

  // `created` tem prioridade: a Server Action revalida a rota automaticamente
  // (padrão do Next.js), então `portalUser` já vem preenchido no próximo
  // render — sem essa ordem, a senha temporária nunca chegaria a aparecer.
  if (created) {
    return (
      <div className="rounded-md bg-emerald-50 dark:bg-emerald-500/10 px-3 py-2 text-sm text-emerald-700 dark:text-emerald-400">
        <p className="font-medium">Acesso criado — repasse estes dados pro cliente (só aparecem uma vez):</p>
        <p className="mt-1">
          E-mail: <span className="font-mono">{created.email}</span>
        </p>
        <p>
          Senha temporária: <span className="font-mono">{created.temporaryPassword}</span>
        </p>
      </div>
    );
  }

  if (portalUser) {
    return (
      <p className="text-sm text-muted">
        Acesso ao portal já criado pra <span className="text-ink">{portalUser.name}</span> ({portalUser.email}).
      </p>
    );
  }

  return (
    <form onSubmit={handleSubmit(submit)} method="post" className="space-y-3" noValidate>
      <p className="text-sm text-muted">
        Sem envio de e-mail automático — depois de criar, você recebe a senha temporária uma vez pra repassar ao
        cliente por fora (WhatsApp, telefone etc).
      </p>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label htmlFor="pu-name">Nome</Label>
          <Input id="pu-name" {...register("name", { required: true, minLength: 2 })} />
          {errors.name && <p className="text-xs text-red-600">Informe o nome.</p>}
        </div>
        <div className="space-y-1">
          <Label htmlFor="pu-email">E-mail</Label>
          <Input id="pu-email" type="email" {...register("email", { required: true })} />
          {errors.email && <p className="text-xs text-red-600">Informe o e-mail.</p>}
        </div>
      </div>
      {serverError && <p className="text-xs text-red-600">{serverError}</p>}
      <Button type="submit" size="sm" disabled={submitting}>
        {submitting ? "Criando..." : "Criar Acesso ao Portal"}
      </Button>
    </form>
  );
}
