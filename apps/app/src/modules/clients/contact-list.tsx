"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { clientContactSchema, type ClientContactInput } from "@/lib/validations/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";

const CONTACT_ROLES = [
  { value: "operacional", label: "Responsável operacional" },
  { value: "financeiro", label: "Responsável financeiro" },
  { value: "socio", label: "Sócio" },
  { value: "procurador", label: "Procurador" },
];

type Contact = { id: string; name: string; role: string; email: string | null; phone: string | null };

export function ContactList({
  clientId,
  contacts,
  canWrite,
  addContact,
  deleteContact,
}: {
  clientId: string;
  contacts: Contact[];
  canWrite: boolean;
  addContact: (clientId: string, input: ClientContactInput) => Promise<void>;
  deleteContact: (clientId: string, contactId: string) => Promise<void>;
}) {
  const router = useRouter();
  const [showForm, setShowForm] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ClientContactInput>({ resolver: zodResolver(clientContactSchema) });

  async function submit(data: ClientContactInput) {
    setServerError(null);
    setSubmitting(true);
    try {
      await addContact(clientId, data);
      reset();
      setShowForm(false);
      router.refresh();
    } catch (err) {
      setServerError(err instanceof Error ? err.message : "Não foi possível salvar.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(contactId: string) {
    await deleteContact(clientId, contactId);
    router.refresh();
  }

  return (
    <div className="rounded-lg border border-border bg-surface p-6">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold text-ink">Contatos</h2>
        {canWrite && (
          <Button variant="outline" size="sm" onClick={() => setShowForm((v) => !v)}>
            {showForm ? "Cancelar" : "+ Contato"}
          </Button>
        )}
      </div>

      {contacts.length === 0 && !showForm && <p className="mt-3 text-sm text-muted-soft">Nenhum contato cadastrado.</p>}

      {contacts.length > 0 && (
        <ul className="mt-3 divide-y divide-border">
          {contacts.map((contact) => (
            <li key={contact.id} className="flex items-center justify-between py-2.5">
              <div>
                <p className="text-sm font-medium text-ink">{contact.name}</p>
                <p className="text-xs text-muted-soft">
                  {CONTACT_ROLES.find((r) => r.value === contact.role)?.label ?? contact.role}
                  {contact.email ? ` · ${contact.email}` : ""}
                  {contact.phone ? ` · ${contact.phone}` : ""}
                </p>
              </div>
              {canWrite && (
                <button
                  type="button"
                  onClick={() => handleDelete(contact.id)}
                  className="text-xs text-red-500 hover:underline"
                >
                  Remover
                </button>
              )}
            </li>
          ))}
        </ul>
      )}

      {showForm && (
        <form onSubmit={handleSubmit(submit)} method="post" className="mt-4 space-y-3 border-t border-border pt-4" noValidate>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="contactName">Nome</Label>
              <Input id="contactName" {...register("name")} />
              {errors.name && <p className="text-xs text-red-600">{errors.name.message}</p>}
            </div>
            <div className="space-y-1">
              <Label htmlFor="contactRole">Papel</Label>
              <Select id="contactRole" {...register("role")}>
                {CONTACT_ROLES.map((role) => (
                  <option key={role.value} value={role.value}>
                    {role.label}
                  </option>
                ))}
              </Select>
            </div>
            <div className="space-y-1">
              <Label htmlFor="contactEmail">E-mail</Label>
              <Input id="contactEmail" type="email" {...register("email")} />
              {errors.email && <p className="text-xs text-red-600">{errors.email.message}</p>}
            </div>
            <div className="space-y-1">
              <Label htmlFor="contactPhone">Telefone</Label>
              <Input id="contactPhone" {...register("phone")} />
            </div>
          </div>

          {serverError && <p className="rounded-md bg-red-50 dark:bg-red-500/10 px-3 py-2 text-sm text-red-700 dark:text-red-400">{serverError}</p>}

          <Button type="submit" size="sm" disabled={submitting}>
            {submitting ? "Salvando..." : "Salvar contato"}
          </Button>
        </form>
      )}
    </div>
  );
}
