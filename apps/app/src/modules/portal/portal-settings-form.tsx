"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { DEFAULT_ACCENT } from "@/modules/portal/settings";
import { savePortalSettings } from "@/modules/portal/actions";

const PRESETS = ["#14528D", "#1B2558", "#3194BE", "#EA7E12", "#047857", "#7C3AED"];

export function PortalSettingsForm({
  clientId,
  clientName,
  initial,
}: {
  clientId: string;
  clientName: string;
  initial: { welcomeMessage: string; accentColor: string; allowRequests: boolean; reviewRequests: boolean; allowApprovals: boolean };
}) {
  const router = useRouter();
  const [welcome, setWelcome] = useState(initial.welcomeMessage);
  const [color, setColor] = useState(initial.accentColor);
  const [allowRequests, setAllowRequests] = useState(initial.allowRequests);
  const [reviewRequests, setReviewRequests] = useState(initial.reviewRequests);
  const [allowApprovals, setAllowApprovals] = useState(initial.allowApprovals);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const validColor = /^#[0-9a-fA-F]{6}$/.test(color);

  async function save() {
    setBusy(true);
    setError(null);
    setSaved(false);
    try {
      await savePortalSettings(clientId, { welcomeMessage: welcome, accentColor: validColor ? color : DEFAULT_ACCENT, allowRequests, reviewRequests, allowApprovals });
      setSaved(true);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível salvar.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div className="space-y-4">
        <div className="space-y-1.5">
          <div className="flex items-baseline justify-between">
            <Label htmlFor="pw-welcome">Mensagem de boas-vindas</Label>
            <span className="text-xs text-muted-soft">{welcome.length}/500</span>
          </div>
          <Textarea
            id="pw-welcome"
            rows={4}
            maxLength={500}
            value={welcome}
            onChange={(e) => {
              setWelcome(e.target.value);
              setSaved(false);
            }}
            placeholder={`Ex.: Olá, equipe ${clientName}! Aqui você acompanha suas demandas e pagamentos.`}
          />
          <p className="text-xs text-muted-soft">Aparece no topo do portal do cliente. Uma frase curta com o nome da empresa deixa o portal mais pessoal.</p>
        </div>

        <div className="space-y-2">
          <Label>Cor de destaque</Label>
          <div className="flex flex-wrap items-center gap-2">
            {PRESETS.map((c) => (
              <button
                key={c}
                type="button"
                aria-label={`Usar a cor ${c}`}
                onClick={() => {
                  setColor(c);
                  setSaved(false);
                }}
                className={`h-8 w-8 rounded-full border-2 ${color.toLowerCase() === c.toLowerCase() ? "border-ink" : "border-transparent"}`}
                style={{ backgroundColor: c }}
              />
            ))}
            <input
              type="color"
              aria-label="Escolher outra cor"
              value={validColor ? color : DEFAULT_ACCENT}
              onChange={(e) => {
                setColor(e.target.value);
                setSaved(false);
              }}
              className="h-8 w-10 cursor-pointer rounded border border-border bg-transparent p-0.5"
            />
            <Input
              aria-label="Código da cor"
              value={color}
              onChange={(e) => {
                setColor(e.target.value);
                setSaved(false);
              }}
              className="h-8 w-28 font-mono text-xs"
            />
          </div>
          {!validColor && <p className="text-xs text-red-600">Use o formato #RRGGBB, por exemplo #14528D.</p>}
        </div>

        <label className="flex items-start gap-2 text-sm text-ink">
          <input
            type="checkbox"
            className="mt-0.5"
            checked={allowRequests}
            onChange={(e) => {
              setAllowRequests(e.target.checked);
              setSaved(false);
            }}
          />
          <span>
            Permitir criar demandas pelo portal
            <span className="block text-xs text-muted-soft">Desligado, o cliente só acompanha e conversa. A opção “Nova Demanda” some do menu dele.</span>
          </span>
        </label>

        {allowRequests && (
          <label className="flex items-start gap-2 text-sm text-ink">
            <input
              type="checkbox"
              className="mt-0.5"
              checked={reviewRequests}
              onChange={(e) => {
                setReviewRequests(e.target.checked);
                setSaved(false);
              }}
            />
            <span>
              Pedidos passam pela minha revisão
              <span className="block text-xs text-muted-soft">Ligado, cada pedido cai em “Pedidos do Portal” para você importar como tarefa ou recusar. Desligado, o pedido já vira tarefa na hora.</span>
            </span>
          </label>
        )}

        <label className="flex items-start gap-2 text-sm text-ink">
          <input
            type="checkbox"
            className="mt-0.5"
            checked={allowApprovals}
            onChange={(e) => {
              setAllowApprovals(e.target.checked);
              setSaved(false);
            }}
          />
          <span>
            Permitir aprovação de entregas
            <span className="block text-xs text-muted-soft">O cliente pode aprovar ou recusar os entregáveis que você envia pela tarefa.</span>
          </span>
        </label>

        {error && <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-500/10 dark:text-red-400">{error}</p>}
        <div className="flex items-center gap-3">
          <Button type="button" onClick={save} disabled={busy || !validColor}>
            {busy ? "Salvando..." : "Salvar configurações"}
          </Button>
          {saved && <span className="text-sm text-emerald-600 dark:text-emerald-400">Salvo.</span>}
        </div>
      </div>

      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">Como o cliente vê</p>
        <div className="overflow-hidden rounded-2xl border border-border/70 bg-surface shadow-sm">
          <div className="h-1.5" style={{ backgroundColor: validColor ? color : DEFAULT_ACCENT }} />
          <div className="p-5">
            <p className="text-sm text-muted">Bem-vindo(a),</p>
            <h3 className="mt-1 text-xl font-bold text-ink">{clientName}</h3>
            {welcome.trim() && <p className="mt-2 whitespace-pre-wrap text-sm text-muted">{welcome.trim()}</p>}
            <div className="mt-4 flex flex-wrap gap-2">
              <span className="rounded-lg px-3 py-1.5 text-xs font-semibold text-white" style={{ backgroundColor: validColor ? color : DEFAULT_ACCENT }}>
                Minhas Tarefas
              </span>
              {allowRequests && (
                <span className="rounded-lg border px-3 py-1.5 text-xs font-semibold" style={{ borderColor: validColor ? color : DEFAULT_ACCENT, color: validColor ? color : DEFAULT_ACCENT }}>
                  + Nova Demanda
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
