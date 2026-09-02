"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { activitySchema, type ActivityInput } from "@/lib/validations/activity";
import { addActivity, deleteActivity, setPrimaryActivity } from "@/modules/companies/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";

type Activity = { id: string; cnae: string; description: string; isPrimary: boolean };

export function ActivityList({ companyId, activities }: { companyId: string; activities: Activity[] }) {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [showForm, setShowForm] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ActivityInput>({ resolver: zodResolver(activitySchema), defaultValues: { isPrimary: false } });

  const hasPrimary = activities.some((a) => a.isPrimary);

  async function submit(data: ActivityInput) {
    setServerError(null);
    setSubmitting(true);
    try {
      await addActivity(companyId, data);
      reset();
      setShowForm(false);
      router.refresh();
    } catch (err) {
      setServerError(err instanceof Error ? err.message : "Não foi possível adicionar o CNAE.");
    } finally {
      setSubmitting(false);
    }
  }

  async function remove(activityId: string) {
    await deleteActivity(companyId, activityId);
    router.refresh();
  }

  async function makePrimary(activityId: string) {
    await setPrimaryActivity(companyId, activityId);
    router.refresh();
  }

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-medium text-ink">Atividades (CNAE)</h2>
        {!hasPrimary && activities.length > 0 && <Badge variant="warning">Sem CNAE principal definido</Badge>}
      </div>

      {activities.length > 0 && (
        <div className="mb-4 overflow-x-auto rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-surface-alt text-left text-muted">
                <th className="px-3 py-2 font-medium">CNAE</th>
                <th className="px-3 py-2 font-medium">Descrição</th>
                <th className="px-3 py-2 font-medium">Principal</th>
                <th className="px-3 py-2 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {activities.map((activity) => (
                <tr key={activity.id} className="border-b border-border last:border-0 bg-surface">
                  <td className="px-3 py-2 text-ink">{activity.cnae}</td>
                  <td className="px-3 py-2 text-muted">{activity.description}</td>
                  <td className="px-3 py-2">
                    {activity.isPrimary ? (
                      <Badge variant="info">Principal</Badge>
                    ) : (
                      <button type="button" onClick={() => makePrimary(activity.id)} className="text-xs text-accent hover:underline">
                        Tornar principal
                      </button>
                    )}
                  </td>
                  <td className="px-3 py-2 text-right">
                    <button type="button" onClick={() => remove(activity.id)} className="text-xs text-red-600 hover:underline">
                      Remover
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {!showForm && (
        <Button type="button" variant="outline" size="sm" onClick={() => setShowForm(true)}>
          + Adicionar CNAE
        </Button>
      )}

      {showForm && (
        <form onSubmit={handleSubmit(submit)} method="post" className="space-y-3 rounded-lg border border-border p-4" noValidate>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="activity-cnae">Código CNAE</Label>
              <Input id="activity-cnae" placeholder="0000-0/00" {...register("cnae")} />
              {errors.cnae && <p className="text-xs text-red-600">{errors.cnae.message}</p>}
            </div>
            <div className="space-y-1">
              <Label htmlFor="activity-description">Descrição</Label>
              <Input id="activity-description" {...register("description")} />
              {errors.description && <p className="text-xs text-red-600">{errors.description.message}</p>}
            </div>
            <div className="flex items-center gap-2 pt-6">
              <input id="activity-primary" type="checkbox" {...register("isPrimary")} className="h-4 w-4" />
              <Label htmlFor="activity-primary">É a atividade principal</Label>
            </div>
          </div>

          {serverError && <p className="text-xs text-red-600">{serverError}</p>}

          <div className="flex gap-2">
            <Button type="submit" size="sm" disabled={submitting}>
              {submitting ? "Adicionando..." : "Adicionar"}
            </Button>
            <Button type="button" size="sm" variant="ghost" onClick={() => setShowForm(false)}>
              Cancelar
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}
