"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { profileSchema, type ProfileInput } from "@/lib/validations/account";
import { resetPasswordSchema, type ResetPasswordInput } from "@/lib/validations/auth";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

function ProfileSection({
  name,
  email,
  updateProfile,
}: {
  name: string;
  email: string;
  updateProfile: (data: ProfileInput) => Promise<void>;
}) {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ProfileInput>({ resolver: zodResolver(profileSchema), defaultValues: { name } });

  async function submit(data: ProfileInput) {
    setServerError(null);
    setSaved(false);
    setSubmitting(true);
    try {
      await updateProfile(data);
      setSaved(true);
      router.refresh();
    } catch (err) {
      setServerError(err instanceof Error ? err.message : "Não foi possível salvar.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-6">
      <h2 className="text-base font-semibold text-brand-navy">Dados pessoais</h2>
      <form onSubmit={handleSubmit(submit)} method="post" className="mt-4 space-y-4" noValidate>
        <div className="space-y-1.5">
          <Label htmlFor="name">Nome</Label>
          <Input id="name" {...register("name")} />
          {errors.name && <p className="text-xs text-red-600">{errors.name.message}</p>}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="email">E-mail</Label>
          <Input id="email" value={email} disabled />
          <p className="text-xs text-slate-400">Para trocar o e-mail, fale com o administrador.</p>
        </div>

        {serverError && (
          <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
            {serverError}
          </p>
        )}
        {saved && !serverError && (
          <p className="rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-700">Dados atualizados.</p>
        )}

        <Button type="submit" disabled={submitting}>
          {submitting ? "Salvando..." : "Salvar dados"}
        </Button>
      </form>
    </div>
  );
}

function PasswordSection() {
  const [serverError, setServerError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ResetPasswordInput>({ resolver: zodResolver(resetPasswordSchema) });

  async function submit(values: ResetPasswordInput) {
    setServerError(null);
    setSaved(false);
    setSubmitting(true);

    const supabase = createSupabaseBrowserClient();
    const { error } = await supabase.auth.updateUser({ password: values.password });

    setSubmitting(false);

    if (error) {
      setServerError("Não foi possível trocar a senha. Tente novamente.");
      return;
    }
    setSaved(true);
    reset();
  }

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-6">
      <h2 className="text-base font-semibold text-brand-navy">Trocar senha</h2>
      <form onSubmit={handleSubmit(submit)} method="post" className="mt-4 space-y-4" noValidate>
        <div className="space-y-1.5">
          <Label htmlFor="password">Nova senha</Label>
          <Input id="password" type="password" autoComplete="new-password" {...register("password")} />
          {errors.password && <p className="text-xs text-red-600">{errors.password.message}</p>}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="confirmPassword">Confirmar nova senha</Label>
          <Input id="confirmPassword" type="password" autoComplete="new-password" {...register("confirmPassword")} />
          {errors.confirmPassword && <p className="text-xs text-red-600">{errors.confirmPassword.message}</p>}
        </div>

        {serverError && (
          <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
            {serverError}
          </p>
        )}
        {saved && !serverError && (
          <p className="rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-700">Senha atualizada.</p>
        )}

        <Button type="submit" disabled={submitting}>
          {submitting ? "Salvando..." : "Trocar senha"}
        </Button>
      </form>
    </div>
  );
}

export function AccountForm({
  name,
  email,
  roleLabel,
  updateProfile,
}: {
  name: string;
  email: string;
  roleLabel: string;
  updateProfile: (data: ProfileInput) => Promise<void>;
}) {
  return (
    <div className="mx-auto max-w-xl space-y-6 p-8">
      <div>
        <h1 className="text-2xl font-bold text-brand-navy">Meu Perfil</h1>
        <p className="mt-1 text-sm text-slate-500">{roleLabel}</p>
      </div>
      <ProfileSection name={name} email={email} updateProfile={updateProfile} />
      <PasswordSection />
    </div>
  );
}
