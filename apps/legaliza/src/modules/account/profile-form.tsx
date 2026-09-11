"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { updateProfile } from "@/modules/account/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function ProfileForm({ defaultName, email }: { defaultName: string; email: string }) {
  const router = useRouter();
  const [name, setName] = useState(defaultName);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaved(false);
    setSubmitting(true);
    try {
      await updateProfile(name);
      setSaved(true);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível salvar.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={submit} className="max-w-md space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="profile-email">E-mail</Label>
        <Input id="profile-email" value={email} disabled readOnly />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="profile-name">Nome</Label>
        <Input id="profile-name" value={name} onChange={(e) => setName(e.target.value)} />
      </div>
      {error && <p className="text-xs text-red-600">{error}</p>}
      {saved && <p className="text-xs text-emerald-600">Salvo.</p>}
      <Button type="submit" disabled={submitting}>
        {submitting ? "Salvando..." : "Salvar"}
      </Button>
    </form>
  );
}
