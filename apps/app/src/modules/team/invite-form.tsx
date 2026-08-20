"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { inviteStaffSchema, STAFF_ROLES, type InviteStaffInput } from "@/lib/validations/team";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";

const ROLE_LABELS: Record<string, string> = {
  ADMIN: "Administrador",
  GESTOR: "Gestor",
  OPERACIONAL: "Operacional",
  FINANCEIRO: "Financeiro",
};

export function InviteStaffForm({
  invite,
}: {
  invite: (data: InviteStaffInput) => Promise<{ inviteLink: string }>;
}) {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [inviteLink, setInviteLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<InviteStaffInput>({ resolver: zodResolver(inviteStaffSchema), defaultValues: { role: "OPERACIONAL" } });

  async function submit(data: InviteStaffInput) {
    setServerError(null);
    setInviteLink(null);
    setCopied(false);
    setSubmitting(true);
    try {
      const result = await invite(data);
      setInviteLink(result.inviteLink);
      reset({ name: "", email: "", role: "OPERACIONAL" });
      router.refresh();
    } catch (err) {
      setServerError(err instanceof Error ? err.message : "Não foi possível criar o convite.");
    } finally {
      setSubmitting(false);
    }
  }

  async function copyLink() {
    if (!inviteLink) return;
    await navigator.clipboard.writeText(inviteLink);
    setCopied(true);
  }

  return (
    <div>
      <form onSubmit={handleSubmit(submit)} method="post" className="grid grid-cols-3 gap-4" noValidate>
        <div className="space-y-1.5">
          <Label htmlFor="name">Nome</Label>
          <Input id="name" {...register("name")} />
          {errors.name && <p className="text-xs text-red-600">{errors.name.message}</p>}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="email">E-mail</Label>
          <Input id="email" type="email" {...register("email")} />
          {errors.email && <p className="text-xs text-red-600">{errors.email.message}</p>}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="role">Papel</Label>
          <Select id="role" {...register("role")}>
            {STAFF_ROLES.map((role) => (
              <option key={role} value={role}>
                {ROLE_LABELS[role]}
              </option>
            ))}
          </Select>
        </div>
        <div className="col-span-3">
          <Button type="submit" disabled={submitting}>
            {submitting ? "Convidando..." : "Convidar"}
          </Button>
        </div>
      </form>

      {serverError && (
        <p role="alert" className="mt-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          {serverError}
        </p>
      )}

      {inviteLink && (
        <div className="mt-4 rounded-md border border-emerald-200 bg-emerald-50 p-4">
          <p className="text-sm font-medium text-emerald-800">
            Convite criado! Copie o link abaixo e envie pra pessoa — ela vai usá-lo pra definir a própria senha.
          </p>
          <div className="mt-2 flex items-center gap-2">
            <Input value={inviteLink} readOnly className="flex-1 bg-white font-mono text-xs" />
            <Button type="button" variant="outline" onClick={copyLink}>
              {copied ? "Copiado!" : "Copiar"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
