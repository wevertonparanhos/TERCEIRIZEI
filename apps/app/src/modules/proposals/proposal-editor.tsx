"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowDown, ArrowUp, Eye, Plus, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { PAYMENT_METHODS, type ProposalContent } from "@/lib/validations/proposal";
import { parseBrl } from "@/modules/processes/process-fields";
import { ProposalDocument, ProposalPrintStyles } from "./proposal-document";
import { subtotalOf, totalOf } from "./content";
import {
  saveProposal,
  sendProposal,
  deleteProposal,
  saveTemplate,
  deleteTemplate,
  saveProposalAsTemplate,
  createProposalBlock,
  deleteProposalBlock,
} from "./actions";

type Block = { id: string; name: string; body: string };
type EditorItem = ProposalContent["items"][number] & { k: string };
type Rest = Omit<ProposalContent, "items">;

const STEPS = [
  { title: "Apresentação", hint: "Título, cliente e texto de abertura." },
  { title: "Escopo e Investimento", hint: "Liste os serviços e o valor de cada um." },
  { title: "Logística e Condições", hint: "Prazos, pagamento e validade." },
  { title: "Acabamento", hint: "Capa e ajustes finais." },
];

const SECTION_PRESETS = ["O que não está incluso", "Bônus", "Sobre a Terceirizei", "Perguntas frequentes"];

const brl = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
let seq = 0;
const newKey = () => `i${Date.now().toString(36)}${seq++}`;

function MoneyInput({ value, onChange, id, placeholder }: { value: number; onChange: (n: number) => void; id?: string; placeholder?: string }) {
  const [text, setText] = useState(value ? String(value).replace(".", ",") : "");
  return (
    <Input
      id={id}
      inputMode="decimal"
      placeholder={placeholder ?? "0,00"}
      value={text}
      onChange={(e) => {
        setText(e.target.value);
        const n = parseBrl(e.target.value);
        if (n !== null) onChange(Math.max(0, n));
      }}
      onBlur={() => setText(value ? value.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "")}
    />
  );
}

/** Caixa de texto com atalho para inserir/guardar blocos de texto reutilizáveis. */
function BlockTextarea({
  id,
  label,
  value,
  onChange,
  rows = 5,
  placeholder,
  blocks,
  onBlockSaved,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  rows?: number;
  placeholder?: string;
  blocks: Block[];
  onBlockSaved: (b: Block) => void;
}) {
  const [naming, setNaming] = useState(false);
  const [blockName, setBlockName] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function saveBlock() {
    setError(null);
    try {
      const block = await createProposalBlock(blockName, value);
      onBlockSaved(block);
      setNaming(false);
      setBlockName("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível salvar o bloco.");
    }
  }

  return (
    <div className="space-y-1.5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Label htmlFor={id}>{label}</Label>
        <div className="flex items-center gap-2">
          {blocks.length > 0 && (
            <select
              aria-label="Inserir bloco de texto"
              value=""
              onChange={(e) => {
                const block = blocks.find((b) => b.id === e.target.value);
                if (block) onChange(value.trim() ? `${value.trimEnd()}\n\n${block.body}` : block.body);
              }}
              className="h-8 rounded-md border border-border-strong bg-surface px-2 text-xs text-ink"
            >
              <option value="">Inserir bloco…</option>
              {blocks.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          )}
          <button
            type="button"
            disabled={!value.trim()}
            onClick={() => setNaming((v) => !v)}
            className="text-xs font-medium text-accent hover:underline disabled:opacity-40"
          >
            Salvar como bloco
          </button>
        </div>
      </div>
      <Textarea id={id} rows={rows} value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} />
      {naming && (
        <div className="flex flex-wrap items-center gap-2">
          <Input value={blockName} onChange={(e) => setBlockName(e.target.value)} placeholder="Nome do bloco" className="h-9 max-w-xs" />
          <Button type="button" size="sm" onClick={saveBlock}>
            Guardar
          </Button>
          <Button type="button" size="sm" variant="outline" onClick={() => setNaming(false)}>
            Cancelar
          </Button>
        </div>
      )}
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}

export function ProposalEditor({
  mode,
  id,
  number,
  initialName,
  initialClientId,
  initialContent,
  clients,
  initialBlocks,
}: {
  mode: "proposal" | "template";
  id: string;
  number?: number;
  /** nome do modelo (só no modo modelo) */
  initialName?: string;
  initialClientId?: string | null;
  initialContent: ProposalContent;
  clients: { id: string; name: string }[];
  initialBlocks: Block[];
}) {
  const router = useRouter();
  const isTemplate = mode === "template";

  const [step, setStep] = useState(0);
  const [name, setName] = useState(initialName ?? "");
  const [clientId, setClientId] = useState<string>(initialClientId ?? "");
  const [rest, setRest] = useState<Rest>(() => {
    const { items: _items, ...others } = initialContent;
    void _items;
    return others;
  });
  const [items, setItems] = useState<EditorItem[]>(() => initialContent.items.map((i) => ({ ...i, k: newKey() })));
  const [blocks, setBlocks] = useState<Block[]>(initialBlocks);

  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState<null | "save" | "send" | "delete" | "template">(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [confirm, setConfirm] = useState<null | "send" | "delete">(null);
  const [templateName, setTemplateName] = useState<string | null>(null);

  const content: ProposalContent = useMemo(
    () => ({ ...rest, items: items.map(({ k: _k, ...item }) => (void _k, item)) }),
    [rest, items]
  );
  const clientName = clients.find((c) => c.id === clientId)?.name ?? null;
  const issuedAt = useMemo(() => new Date().toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" }), []);

  function patch(p: Partial<Rest>) {
    setRest((r) => ({ ...r, ...p }));
    setDirty(true);
    setNotice(null);
  }
  function patchItem(k: string, p: Partial<ProposalContent["items"][number]>) {
    setItems((list) => list.map((it) => (it.k === k ? { ...it, ...p } : it)));
    setDirty(true);
    setNotice(null);
  }
  function moveItem(index: number, dir: -1 | 1) {
    setItems((list) => {
      const next = [...list];
      const target = index + dir;
      if (target < 0 || target >= next.length) return list;
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
    setDirty(true);
  }

  /** Salva no servidor. Linhas de serviço totalmente vazias são descartadas. */
  async function save(): Promise<boolean> {
    setError(null);
    const cleanItems = content.items.filter((i) => i.description.trim() || i.value > 0 || i.detail.trim());
    if (cleanItems.some((i) => i.description.trim().length < 2)) {
      setError("Descreva todos os serviços (ou remova a linha em branco).");
      return false;
    }
    if (rest.title.trim().length < 3) {
      setError("Dê um título para a proposta (mínimo 3 letras).");
      setStep(0);
      return false;
    }
    if (isTemplate && name.trim().length < 2) {
      setError("Dê um nome para o modelo.");
      setStep(0);
      return false;
    }
    const payload: ProposalContent = { ...content, items: cleanItems };
    setBusy("save");
    try {
      if (isTemplate) await saveTemplate(id, { name, content: payload });
      else await saveProposal(id, { clientId: clientId || null, content: payload });
      setItems((list) => list.filter((it) => it.description.trim() || it.value > 0 || it.detail.trim()));
      setDirty(false);
      setNotice("Alterações salvas.");
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível salvar.");
      return false;
    } finally {
      setBusy(null);
    }
  }

  async function goTo(next: number) {
    if (dirty && !(await save())) return;
    setStep(next);
  }

  async function handleSend() {
    if (!(await save())) {
      setConfirm(null);
      return;
    }
    setBusy("send");
    try {
      await sendProposal(id);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível enviar.");
      setConfirm(null);
    } finally {
      setBusy(null);
    }
  }

  async function handleDelete() {
    setBusy("delete");
    try {
      if (isTemplate) await deleteTemplate(id);
      else await deleteProposal(id);
      router.push("/propostas");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível excluir.");
      setConfirm(null);
      setBusy(null);
    }
  }

  async function handleSaveAsTemplate() {
    if (templateName === null) return;
    if (!(await save())) return;
    setBusy("template");
    try {
      await saveProposalAsTemplate(id, templateName);
      setTemplateName(null);
      setNotice("Modelo criado. Ele aparece em “Modelos” na lista de propostas.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível criar o modelo.");
    } finally {
      setBusy(null);
    }
  }

  async function removeBlock(blockId: string) {
    try {
      await deleteProposalBlock(blockId);
      setBlocks((list) => list.filter((b) => b.id !== blockId));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível excluir o bloco.");
    }
  }

  const subtotal = subtotalOf(content);
  const total = totalOf(content);
  const addBlock = (b: Block) => setBlocks((list) => [...list, b]);
  const busyAny = busy !== null;

  return (
    <div className="mx-auto max-w-[1280px] space-y-5 p-4 sm:p-8">
      <ProposalPrintStyles />

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link href="/propostas" className="text-sm text-accent hover:underline">
            ← Voltar para Propostas
          </Link>
          <h1 className="mt-1 text-2xl font-bold text-ink">
            {isTemplate ? "Editar modelo" : `Proposta #${number}`}
            {dirty && <span className="ml-2 align-middle text-xs font-medium text-amber-600">alterações não salvas</span>}
          </h1>
          <p className="text-sm text-muted">
            {isTemplate ? "Um modelo é uma proposta pronta para reaproveitar: altere tudo à vontade." : "Rascunho — só fica visível ao cliente depois de enviada."}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button type="button" variant="outline" size="sm" onClick={() => setPreviewOpen(true)}>
            <Eye className="mr-1.5 h-4 w-4" />
            Pré-visualizar
          </Button>
          <Button type="button" size="sm" onClick={save} disabled={busyAny}>
            {busy === "save" ? "Salvando..." : "Salvar"}
          </Button>
        </div>
      </div>

      <ol className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {STEPS.map((s, i) => (
          <li key={s.title}>
            <button
              type="button"
              onClick={() => goTo(i)}
              disabled={busyAny}
              className={`flex w-full items-center gap-2 rounded-lg border px-3 py-2 text-left text-sm transition-colors ${
                i === step ? "border-accent bg-accent-soft text-ink" : "border-border bg-surface text-muted hover:bg-surface-alt"
              }`}
            >
              <span
                className={`flex h-6 w-6 flex-none items-center justify-center rounded-full text-xs font-bold ${
                  i === step ? "bg-accent text-white" : i < step ? "bg-accent-soft text-accent" : "bg-surface-alt text-muted"
                }`}
              >
                {i + 1}
              </span>
              <span className="truncate font-medium">{s.title}</span>
            </button>
          </li>
        ))}
      </ol>

      {error && (
        <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-500/10 dark:text-red-400">
          {error}
        </p>
      )}
      {notice && !error && (
        <p role="status" className="rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400">
          {notice}
        </p>
      )}

      <div className="grid items-start gap-6 lg:grid-cols-2">
        <div className="space-y-5 rounded-2xl border border-border/70 bg-surface p-5 shadow-sm sm:p-6">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted">Etapa {step + 1}</p>
            <h2 className="text-lg font-bold text-ink">{STEPS[step].title}</h2>
            <p className="text-sm text-muted">{STEPS[step].hint}</p>
          </div>

          {step === 0 && (
            <div className="space-y-4">
              {isTemplate && (
                <div className="space-y-1.5">
                  <Label htmlFor="tpl-name">Nome do modelo</Label>
                  <Input
                    id="tpl-name"
                    value={name}
                    onChange={(e) => {
                      setName(e.target.value);
                      setDirty(true);
                    }}
                    placeholder="Ex.: BPO Financeiro mensal"
                  />
                </div>
              )}
              <div className="space-y-1.5">
                <Label htmlFor="p-title">Título da proposta</Label>
                <Input id="p-title" value={rest.title} onChange={(e) => patch({ title: e.target.value })} placeholder="Ex.: BPO de Legalização" />
              </div>
              {!isTemplate && (
                <div className="space-y-1.5">
                  <Label htmlFor="p-client">Cliente</Label>
                  <Select
                    id="p-client"
                    value={clientId}
                    onChange={(e) => {
                      setClientId(e.target.value);
                      setDirty(true);
                    }}
                  >
                    <option value="">Escolher depois</option>
                    {clients.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </Select>
                  <p className="text-xs text-muted-soft">O cliente é obrigatório só na hora de enviar.</p>
                </div>
              )}
              <BlockTextarea
                id="p-intro"
                label="Apresentação"
                rows={7}
                value={rest.intro}
                onChange={(v) => patch({ intro: v })}
                placeholder="Apresente a Terceirizei e o que você vai entregar a este cliente."
                blocks={blocks}
                onBlockSaved={addBlock}
              />
            </div>
          )}

          {step === 1 && (
            <div className="space-y-4">
              <div className="space-y-3">
                {items.length === 0 && <p className="rounded-lg border border-dashed border-border p-4 text-center text-sm text-muted-soft">Nenhum serviço ainda. Adicione o primeiro abaixo.</p>}
                {items.map((item, index) => (
                  <div key={item.k} className="space-y-2 rounded-xl border border-border bg-surface-alt/40 p-3">
                    <div className="flex items-center gap-2">
                      <span className="flex h-6 w-6 flex-none items-center justify-center rounded-full bg-accent-soft text-xs font-bold text-accent">{index + 1}</span>
                      <Input
                        aria-label={`Serviço ${index + 1}`}
                        value={item.description}
                        onChange={(e) => patchItem(item.k, { description: e.target.value })}
                        placeholder="Nome do serviço"
                      />
                      <div className="w-36 flex-none">
                        <MoneyInput value={item.value} onChange={(n) => patchItem(item.k, { value: n })} />
                      </div>
                    </div>
                    <Textarea
                      aria-label={`Detalhes do serviço ${index + 1}`}
                      rows={2}
                      value={item.detail}
                      onChange={(e) => patchItem(item.k, { detail: e.target.value })}
                      placeholder="Detalhes do que está incluído (opcional)"
                    />
                    <div className="flex items-center justify-end gap-1">
                      <button type="button" onClick={() => moveItem(index, -1)} disabled={index === 0} aria-label="Subir" className="rounded p-1.5 text-muted hover:bg-surface-alt disabled:opacity-30">
                        <ArrowUp className="h-4 w-4" />
                      </button>
                      <button type="button" onClick={() => moveItem(index, 1)} disabled={index === items.length - 1} aria-label="Descer" className="rounded p-1.5 text-muted hover:bg-surface-alt disabled:opacity-30">
                        <ArrowDown className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setItems((list) => list.filter((it) => it.k !== item.k));
                          setDirty(true);
                        }}
                        aria-label="Remover serviço"
                        className="rounded p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  setItems((list) => [...list, { k: newKey(), description: "", detail: "", value: 0 }]);
                  setDirty(true);
                }}
              >
                <Plus className="mr-1.5 h-4 w-4" />
                Adicionar serviço
              </Button>

              <div className="space-y-2 border-t border-border pt-4">
                <div className="flex items-center justify-between gap-3">
                  <Label htmlFor="p-discount">Desconto (R$)</Label>
                  <div className="w-36">
                    <MoneyInput id="p-discount" value={rest.discount} onChange={(n) => patch({ discount: n })} />
                  </div>
                </div>
                <div className="flex items-center justify-between text-sm text-muted">
                  <span>Subtotal</span>
                  <span className="font-mono">{brl.format(subtotal)}</span>
                </div>
                <div className="flex items-center justify-between text-base font-semibold text-ink">
                  <span>Total</span>
                  <span className="font-mono">{brl.format(total)}</span>
                </div>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-5">
              <div className="space-y-2">
                <Label>Disponibilidade</Label>
                <label className="flex items-center gap-2 text-sm text-ink">
                  <input type="checkbox" checked={rest.startImmediately} onChange={(e) => patch({ startImmediately: e.target.checked })} />
                  Tenho disponibilidade imediata
                </label>
                {!rest.startImmediately && (
                  <Input aria-label="Data de início" type="date" value={rest.startDate} onChange={(e) => patch({ startDate: e.target.value })} className="max-w-[200px]" />
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="p-duration">Duração do projeto</Label>
                <Input id="p-duration" value={rest.duration} onChange={(e) => patch({ duration: e.target.value })} placeholder="Ex.: 3 meses, contrato mensal recorrente…" />
              </div>

              <div className="space-y-2">
                <Label>Estrutura do pagamento</Label>
                <div className="flex gap-2">
                  {(["AVISTA", "PARCELADO"] as const).map((opt) => (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => patch({ paymentStructure: opt, installments: opt === "PARCELADO" ? rest.installments ?? 2 : null })}
                      className={`rounded-lg border px-4 py-2 text-sm font-medium transition-colors ${
                        rest.paymentStructure === opt ? "border-accent bg-accent-soft text-ink" : "border-border bg-surface text-muted hover:bg-surface-alt"
                      }`}
                    >
                      {opt === "AVISTA" ? "À vista" : "Parcelado"}
                    </button>
                  ))}
                </div>
                {rest.paymentStructure === "PARCELADO" && (
                  <div className="flex items-center gap-2 text-sm text-ink">
                    <Input
                      aria-label="Número de parcelas"
                      type="number"
                      min={2}
                      max={60}
                      value={rest.installments ?? 2}
                      onChange={(e) => patch({ installments: Math.min(60, Math.max(2, Number(e.target.value) || 2)) })}
                      className="w-24"
                    />
                    parcelas
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label>Forma de pagamento</Label>
                <div className="flex flex-wrap gap-x-5 gap-y-2">
                  {PAYMENT_METHODS.map((m) => (
                    <label key={m} className="flex items-center gap-2 text-sm text-ink">
                      <input
                        type="checkbox"
                        checked={rest.paymentMethods.includes(m)}
                        onChange={(e) => patch({ paymentMethods: e.target.checked ? [...rest.paymentMethods, m] : rest.paymentMethods.filter((x) => x !== m) })}
                      />
                      {m}
                    </label>
                  ))}
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="p-valid">Validade (dias corridos)</Label>
                <Input
                  id="p-valid"
                  type="number"
                  min={1}
                  max={365}
                  value={rest.validDays}
                  onChange={(e) => patch({ validDays: Math.min(365, Math.max(1, Number(e.target.value) || 1)) })}
                  className="w-28"
                />
                <p className="text-xs text-muted-soft">Conta a partir do envio. Depois desse prazo a proposta aparece como “Expirada”.</p>
              </div>

              <BlockTextarea
                id="p-notes"
                label="Observações (opcional)"
                rows={4}
                value={rest.notes}
                onChange={(v) => patch({ notes: v })}
                blocks={blocks}
                onBlockSaved={addBlock}
              />

              <div className="space-y-3 border-t border-border pt-4">
                <div>
                  <Label>Seções extras (opcional)</Label>
                  <p className="text-xs text-muted-soft">O que não está incluso, bônus, sobre nós e perguntas frequentes reduzem objeções.</p>
                </div>
                {rest.extraSections.map((section, i) => (
                  <div key={i} className="space-y-2 rounded-xl border border-border bg-surface-alt/40 p-3">
                    <div className="flex items-center gap-2">
                      <Input
                        aria-label={`Título da seção ${i + 1}`}
                        value={section.title}
                        onChange={(e) => patch({ extraSections: rest.extraSections.map((s, j) => (j === i ? { ...s, title: e.target.value } : s)) })}
                        placeholder="Título da seção"
                      />
                      <button
                        type="button"
                        aria-label="Remover seção"
                        onClick={() => patch({ extraSections: rest.extraSections.filter((_, j) => j !== i) })}
                        className="rounded p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                    <BlockTextarea
                      id={`p-section-${i}`}
                      label="Texto"
                      rows={4}
                      value={section.body}
                      onChange={(v) => patch({ extraSections: rest.extraSections.map((s, j) => (j === i ? { ...s, body: v } : s)) })}
                      blocks={blocks}
                      onBlockSaved={addBlock}
                    />
                  </div>
                ))}
                <div className="flex flex-wrap gap-2">
                  {SECTION_PRESETS.filter((p) => !rest.extraSections.some((s) => s.title === p)).map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => patch({ extraSections: [...rest.extraSections, { title: preset, body: "" }] })}
                      className="rounded-full border border-border bg-surface px-3 py-1 text-xs font-medium text-muted hover:bg-surface-alt"
                    >
                      + {preset}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => patch({ extraSections: [...rest.extraSections, { title: "", body: "" }] })}
                    className="rounded-full border border-border bg-surface px-3 py-1 text-xs font-medium text-muted hover:bg-surface-alt"
                  >
                    + Seção em branco
                  </button>
                </div>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-5">
              <div className="space-y-1.5">
                <Label htmlFor="p-cover">Imagem de capa (URL)</Label>
                <Input id="p-cover" type="url" value={rest.coverUrl} onChange={(e) => patch({ coverUrl: e.target.value })} placeholder="https://…" />
                <p className="text-xs text-muted-soft">Opcional. Aparece no topo da proposta, abaixo da barra colorida.</p>
              </div>

              {!isTemplate && (
                <label className="flex items-start gap-2 text-sm text-ink">
                  <input type="checkbox" className="mt-0.5" checked={rest.hideClientContact} onChange={(e) => patch({ hideClientContact: e.target.checked })} />
                  <span>
                    Esconder o nome do cliente
                    <span className="block text-xs text-muted-soft">Útil quando a proposta vai ser compartilhada externamente.</span>
                  </span>
                </label>
              )}

              <div className="rounded-xl border border-border p-3">
                <p className="text-sm font-medium text-ink">Pré-visualizar como cliente</p>
                <p className="text-xs text-muted-soft">Abre a proposta em tela cheia, exatamente como o cliente vai receber (com logo e cores da Terceirizei).</p>
                <Button type="button" variant="outline" size="sm" className="mt-2" onClick={() => setPreviewOpen(true)}>
                  <Eye className="mr-1.5 h-4 w-4" />
                  Pré-visualizar
                </Button>
              </div>

              <div className="space-y-2 rounded-xl border border-border p-3">
                <p className="text-sm font-medium text-ink">Blocos de texto salvos</p>
                {blocks.length === 0 ? (
                  <p className="text-xs text-muted-soft">Nenhum bloco ainda. Escreva um texto e use “Salvar como bloco” para reaproveitá-lo.</p>
                ) : (
                  <ul className="divide-y divide-border">
                    {blocks.map((b) => (
                      <li key={b.id} className="flex items-center justify-between gap-2 py-1.5 text-sm">
                        <span className="truncate text-ink">{b.name}</span>
                        <button type="button" onClick={() => removeBlock(b.id)} className="text-xs text-red-500 hover:underline">
                          Excluir
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {!isTemplate && (
                <div className="space-y-2 rounded-xl border border-border p-3">
                  <p className="text-sm font-medium text-ink">Salvar como modelo</p>
                  <p className="text-xs text-muted-soft">Guarda esta proposta para criar outras iguais com um clique.</p>
                  {templateName === null ? (
                    <Button type="button" variant="outline" size="sm" onClick={() => setTemplateName(rest.title)}>
                      Criar modelo a partir desta proposta
                    </Button>
                  ) : (
                    <div className="flex flex-wrap items-center gap-2">
                      <Input value={templateName} onChange={(e) => setTemplateName(e.target.value)} placeholder="Nome do modelo" className="h-9 max-w-xs" />
                      <Button type="button" size="sm" onClick={handleSaveAsTemplate} disabled={busyAny}>
                        {busy === "template" ? "Criando..." : "Criar modelo"}
                      </Button>
                      <Button type="button" size="sm" variant="outline" onClick={() => setTemplateName(null)}>
                        Cancelar
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
            <div className="flex items-center gap-2">
              {step > 0 && (
                <Button type="button" variant="outline" onClick={() => goTo(step - 1)} disabled={busyAny}>
                  Anterior
                </Button>
              )}
              {step < STEPS.length - 1 ? (
                <Button type="button" onClick={() => goTo(step + 1)} disabled={busyAny}>
                  Próxima etapa
                </Button>
              ) : (
                <Button type="button" onClick={save} disabled={busyAny}>
                  {busy === "save" ? "Salvando..." : "Salvar alterações"}
                </Button>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-3">
              {confirm === "delete" ? (
                <span className="flex items-center gap-2 text-sm text-muted">
                  Excluir {isTemplate ? "este modelo" : "esta proposta"} de vez?
                  <Button type="button" size="sm" variant="outline" onClick={handleDelete} disabled={busyAny}>
                    {busy === "delete" ? "Excluindo..." : "Sim, excluir"}
                  </Button>
                  <Button type="button" size="sm" variant="ghost" onClick={() => setConfirm(null)}>
                    Voltar
                  </Button>
                </span>
              ) : (
                <button type="button" onClick={() => setConfirm("delete")} className="text-xs text-red-500 hover:underline">
                  {isTemplate ? "Excluir modelo" : "Excluir proposta"}
                </button>
              )}

              {!isTemplate &&
                step === STEPS.length - 1 &&
                (confirm === "send" ? (
                  <span className="flex items-center gap-2 text-sm text-muted">
                    Enviar ao cliente? Para editar depois, volte para rascunho.
                    <Button type="button" size="sm" onClick={handleSend} disabled={busyAny}>
                      {busy === "send" ? "Enviando..." : "Sim, enviar"}
                    </Button>
                    <Button type="button" size="sm" variant="ghost" onClick={() => setConfirm(null)}>
                      Voltar
                    </Button>
                  </span>
                ) : (
                  <Button type="button" variant="outline" onClick={() => setConfirm("send")} disabled={busyAny}>
                    Enviar ao cliente
                  </Button>
                ))}
            </div>
          </div>
        </div>

        <div className="lg:sticky lg:top-4">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">Prévia em tempo real</p>
          {!previewOpen && (
            <div className="overflow-x-auto">
              <ProposalDocument content={content} number={number} clientName={clientName} issuedAt={issuedAt} isTemplate={isTemplate} />
            </div>
          )}
        </div>
      </div>

      {previewOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-100 p-4 print:static print:overflow-visible print:bg-white print:p-0 dark:bg-slate-900">
          <div className="mx-auto mb-3 flex max-w-[820px] items-center justify-between print:hidden">
            <p className="text-sm font-medium text-ink">Assim o cliente vai ver</p>
            <div className="flex items-center gap-2">
              <Button type="button" size="sm" onClick={() => window.print()}>
                Exportar PDF
              </Button>
              <Button type="button" size="sm" variant="outline" onClick={() => setPreviewOpen(false)}>
                <X className="mr-1 h-4 w-4" />
                Fechar
              </Button>
            </div>
          </div>
          <ProposalDocument content={content} number={number} clientName={clientName} issuedAt={issuedAt} isTemplate={isTemplate} />
        </div>
      )}
    </div>
  );
}
