"use client";

import { useEffect, useMemo, useState } from "react";
import { Printer } from "lucide-react";

export type ReportRow = {
  id: string;
  group: "periodo" | "atraso";
  number: number;
  title: string;
  /** dd/mm/aaaa — início (criação) da tarefa */
  startLabel: string;
  /** dd/mm/aaaa ou "" */
  dueLabel: string;
  /** dias de atraso (0 = não atrasada) */
  daysLate: number;
  paid: boolean;
  installmentLabel: string | null;
  value: number;
  /** tarefa do período sem valor cadastrado (entra no relatório só para constar) */
  noValue?: boolean;
};

const NAVY = "#1B2558";
const BLUE = "#14528D";
const ORANGE = "#EA7E12";
const CYAN = "#3194BE";

const brl = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const PAYMENT_NOTE_KEY = "relatorio-dados-pagamento";

// Dados de pagamento padrão da Terceirizei (editáveis no relatório; o que você editar fica lembrado).
const DEFAULT_PAYMENT_INFO =
  "Chave PIX (CNPJ): 50.821.759/0001-03\nBanco: Mercado Pago\nFavorecido: Terceirizei Consultoria e Gestão Empresarial";

const COMPANY = {
  name: "Terceirizei Consultoria e Gestão Empresarial",
  cnpj: "50.821.759/0001-03",
  phone: "(31) 98354-6696",
  email: "contato@terceirizei.com.br",
  site: "terceirizeibpo.com.br",
};

/** dd/mm/aaaa -> aaaa-mm-dd (campo de data); "" se não for uma data. */
function labelToIso(label: string | null | undefined): string {
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(label ?? "");
  return m ? `${m[3]}-${m[2]}-${m[1]}` : "";
}
/** aaaa-mm-dd -> dd/mm/aaaa */
function isoToLabel(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : "";
}

function statusOf(row: ReportRow): { label: string; color: string; bg: string } {
  if (row.noValue) return { label: "Sem valor", color: "#475569", bg: "#E2E8F0" };
  if (row.paid) return { label: "Pago", color: "#047857", bg: "#D1FAE5" };
  if (row.daysLate > 0) return { label: "Atrasado", color: "#B91C1C", bg: "#FEE2E2" };
  return { label: "A pagar", color: "#92400E", bg: "#FEF3C7" };
}

/** Relatório que vai para o cliente: a equipe escolhe o que entra (pendentes do mês, pagas, atrasadas),
 * tira linhas avulsas, escreve uma mensagem e os dados de pagamento, e exporta em PDF no padrão da marca. */
export function ClientReportBuilder({
  clientName,
  periodTitle,
  periodLabel,
  sendDateLabel,
  dueDateLabel,
  dueBusinessDay,
  contractNumber,
  rows,
  hasUndatedWarning,
}: {
  clientName: string;
  periodTitle: string;
  periodLabel: string;
  /** dd/mm/aaaa — último dia útil do mês de referência (envio do relatório); null se o período não for um mês */
  sendDateLabel?: string | null;
  /** dd/mm/aaaa — N-ésimo dia útil do mês seguinte (vencimento) */
  dueDateLabel?: string | null;
  dueBusinessDay?: number;
  /** nº da proposta/contrato aceito pelo cliente, se houver */
  contractNumber?: number | null;
  rows: ReportRow[];
  hasUndatedWarning?: string | null;
}) {
  const [showPending, setShowPending] = useState(true);
  const [showPaid, setShowPaid] = useState(false);
  const [showOverdue, setShowOverdue] = useState(true);
  const [showNoValue, setShowNoValue] = useState(true);
  const [excluded, setExcluded] = useState<Set<string>>(new Set());
  const [message, setMessage] = useState("");
  const [paymentInfo, setPaymentInfo] = useState(DEFAULT_PAYMENT_INFO);
  // Vencimento do pagamento: por padrão é o do contrato (N-ésimo dia útil do mês seguinte), mas a equipe pode trocar a data.
  const defaultDueIso = labelToIso(dueDateLabel);
  const [dueOverride, setDueOverride] = useState<string | null>(null);
  const effectiveDueIso = dueOverride ?? defaultDueIso;
  const effectiveDueLabel = effectiveDueIso ? isoToLabel(effectiveDueIso) : null;
  const dueEdited = dueOverride !== null && dueOverride !== defaultDueIso;

  // Os dados de pagamento (PIX, banco) se repetem todo mês: ficam lembrados neste navegador.
  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(PAYMENT_NOTE_KEY);
      if (saved !== null) setPaymentInfo(saved);
    } catch {
      // sem armazenamento: digite de novo
    }
  }, []);
  function updatePaymentInfo(v: string) {
    setPaymentInfo(v);
    try {
      window.localStorage.setItem(PAYMENT_NOTE_KEY, v);
    } catch {
      // ignora
    }
  }

  const periodRows = rows.filter((r) => r.group === "periodo");
  const overdueRows = rows.filter((r) => r.group === "atraso");

  const visiblePeriod = periodRows.filter((r) => (r.noValue ? showNoValue : r.paid ? showPaid : showPending));
  const visibleOverdue = showOverdue ? overdueRows : [];
  const included = (r: ReportRow) => !excluded.has(r.id);

  const finalPeriod = visiblePeriod.filter(included);
  const finalOverdue = visibleOverdue.filter(included);

  const totals = useMemo(() => {
    const all = [...finalPeriod, ...finalOverdue];
    const sum = (list: ReportRow[]) => list.reduce((s, r) => s + r.value, 0);
    return {
      demandas: sum(finalPeriod),
      pago: sum(all.filter((r) => r.paid)),
      aPagar: sum(all.filter((r) => !r.paid)),
      atrasado: sum(all.filter((r) => !r.paid && r.daysLate > 0)),
      count: all.length,
    };
  }, [finalPeriod, finalOverdue]);

  function toggleRow(id: string) {
    setExcluded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const issuedAt = new Date().toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" });

  const renderTable = (title: string, subtitle: string, list: ReportRow[], mode: "periodo" | "atraso") => (
    <section style={{ marginTop: 22 }}>
      <h2 style={{ margin: 0, fontSize: 13, fontWeight: 800, color: NAVY, letterSpacing: 0.4, textTransform: "uppercase" }}>{title}</h2>
      <p style={{ margin: "2px 0 8px", fontSize: 11, color: "#64748B" }}>{subtitle}</p>
      <div style={{ overflowX: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
        <thead>
          <tr style={{ background: NAVY, color: "#FFFFFF" }}>
            <th className="print:hidden" style={{ width: 26, padding: "7px 6px" }} />
            <th style={{ padding: "7px 10px", textAlign: "left", fontWeight: 600 }}>Início</th>
            <th style={{ padding: "7px 10px", textAlign: "left", fontWeight: 600 }}>Demanda</th>
            <th style={{ padding: "7px 10px", textAlign: "left", fontWeight: 600 }}>Previsão de pagamento</th>
            <th style={{ padding: "7px 10px", textAlign: "left", fontWeight: 600 }}>{mode === "atraso" ? "Atraso" : "Situação"}</th>
            <th style={{ padding: "7px 10px", textAlign: "right", fontWeight: 600 }}>Valor</th>
          </tr>
        </thead>
        <tbody>
          {list.map((r, i) => {
            const off = excluded.has(r.id);
            const st = statusOf(r);
            return (
              <tr
                key={r.id}
                className={off ? "print:hidden" : ""}
                style={{ background: i % 2 ? "#F8FAFC" : "#FFFFFF", borderBottom: "1px solid #E2E8F0", opacity: off ? 0.4 : 1 }}
              >
                <td className="print:hidden" style={{ padding: "6px", textAlign: "center" }}>
                  <input type="checkbox" checked={!off} onChange={() => toggleRow(r.id)} aria-label={`Incluir #${r.number} no relatório`} />
                </td>
                <td style={{ padding: "7px 10px", color: "#475569", whiteSpace: "nowrap" }}>{r.startLabel}</td>
                <td style={{ padding: "7px 10px", color: "#0F172A" }}>
                  <b style={{ color: BLUE }}>#{r.number}</b> {r.title}
                  {r.installmentLabel && <span style={{ color: "#94A3B8" }}> · {r.installmentLabel}</span>}
                </td>
                <td style={{ padding: "7px 10px", color: "#475569", whiteSpace: "nowrap" }}>{r.dueLabel || "—"}</td>
                <td style={{ padding: "7px 10px" }}>
                  {mode === "atraso" ? (
                    <span style={{ color: "#B91C1C", fontWeight: 600 }}>{r.daysLate} dia(s)</span>
                  ) : (
                    <span style={{ background: st.bg, color: st.color, borderRadius: 999, padding: "2px 9px", fontSize: 11, fontWeight: 700 }}>
                      {st.label}
                    </span>
                  )}
                </td>
                <td style={{ padding: "7px 10px", textAlign: "right", fontWeight: 700, color: r.noValue ? "#94A3B8" : "#0F172A", whiteSpace: "nowrap" }}>{r.noValue ? "—" : brl.format(r.value)}</td>
              </tr>
            );
          })}
          {list.length === 0 && (
            <tr>
              <td colSpan={6} style={{ padding: 16, textAlign: "center", color: "#94A3B8" }}>
                Nada para mostrar nesta seção.
              </td>
            </tr>
          )}
        </tbody>
      </table>
      </div>
    </section>
  );

  return (
    <div className="space-y-5">
      <style>{`
        @media print {
          @page { size: A4; margin: 12mm; }
          html, body { background: #fff !important; }
          .report-doc { box-shadow: none !important; border: none !important; padding: 0 !important; max-width: none !important; }
          * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        }
      `}</style>

      {/* Controles (não saem no PDF) */}
      <div className="space-y-4 rounded-2xl border border-border/70 bg-surface p-5 shadow-sm print:hidden">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-ink">O que enviar ao cliente</h2>
            <p className="text-xs text-muted">Escolha as seções e tire linhas avulsas; os totais e o PDF acompanham.</p>
          </div>
          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex h-10 items-center gap-2 rounded-lg bg-accent px-4 text-sm font-medium text-white shadow-sm hover:bg-accent/90"
          >
            <Printer className="h-4 w-4" />
            Exportar PDF
          </button>
        </div>

        <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-ink">
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={showPending} onChange={(e) => setShowPending(e.target.checked)} />
            Demandas do período a pagar ({periodRows.filter((r) => !r.paid && !r.noValue).length})
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={showPaid} onChange={(e) => setShowPaid(e.target.checked)} />
            Demandas do período já pagas ({periodRows.filter((r) => r.paid).length})
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={showNoValue} onChange={(e) => setShowNoValue(e.target.checked)} />
            Tarefas do período sem valor ({periodRows.filter((r) => r.noValue).length})
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={showOverdue} onChange={(e) => setShowOverdue(e.target.checked)} />
            Atrasadas de outros períodos ({overdueRows.length})
          </label>
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <div className="space-y-1">
            <label htmlFor="rel-msg" className="text-xs font-medium text-muted">
              Mensagem para o cliente (opcional)
            </label>
            <textarea
              id="rel-msg"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={3}
              placeholder="Ex.: Olá! Segue o resumo das demandas solicitadas em outubro."
              className="w-full rounded-lg border border-border-strong bg-surface px-3 py-2 text-sm text-ink"
            />
          </div>
          <div className="space-y-1">
            <label htmlFor="rel-pix" className="text-xs font-medium text-muted">
              Dados para pagamento (PIX/banco) — fica lembrado neste navegador
            </label>
            <textarea
              id="rel-pix"
              value={paymentInfo}
              onChange={(e) => updatePaymentInfo(e.target.value)}
              rows={3}
              placeholder="Chave PIX, banco e favorecido"
              className="w-full rounded-lg border border-border-strong bg-surface px-3 py-2 text-sm text-ink"
            />
          </div>
        </div>
        <div className="flex flex-wrap items-end gap-x-4 gap-y-2 rounded-xl border border-border bg-surface-alt/60 px-4 py-3">
          <div className="space-y-1">
            <label htmlFor="rel-due" className="block text-xs font-medium text-muted">
              Vencimento do pagamento
            </label>
            <input
              id="rel-due"
              type="date"
              value={effectiveDueIso}
              onChange={(e) => setDueOverride(e.target.value || "")}
              className="h-9 rounded-lg border border-border-strong bg-surface px-3 text-sm text-ink"
            />
          </div>
          <p className="max-w-md pb-1 text-xs text-muted">
            {dueEdited || (dueOverride === "" && defaultDueIso) ? (
              <>
                Data ajustada por você.{" "}
                {defaultDueIso && (
                  <button type="button" className="font-medium text-accent hover:underline" onClick={() => setDueOverride(null)}>
                    Voltar ao padrão ({dueDateLabel})
                  </button>
                )}
              </>
            ) : defaultDueIso ? (
              <>Padrão do contrato: {dueBusinessDay ?? 5}º dia útil do mês seguinte. Você pode alterar a data e o PDF acompanha.</>
            ) : (
              <>Escolha a data de vencimento que sairá no relatório.</>
            )}
          </p>
        </div>
        {hasUndatedWarning && <p className="rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:bg-amber-500/10 dark:text-amber-300">{hasUndatedWarning}</p>}
      </div>

      {/* Documento (é isto que sai no PDF) */}
      <div className="report-doc mx-auto max-w-[820px] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm" style={{ color: "#0F172A", fontFamily: "'Montserrat', 'Inter', system-ui, sans-serif" }}>
        <div style={{ height: 6, background: `linear-gradient(90deg, ${NAVY}, ${BLUE} 55%, ${ORANGE})` }} />
        <div style={{ padding: "26px clamp(14px, 4vw, 32px) 28px" }}>
          <header style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo-terceirizei.png" alt="Terceirizei — Consultoria e Gestão Empresarial" style={{ height: 62, width: "auto" }} />
            <div style={{ textAlign: "right" }}>
              <p style={{ margin: 0, fontSize: 15, fontWeight: 800, color: NAVY, letterSpacing: 0.5 }}>RELATÓRIO DE SERVIÇOS</p>
              <p style={{ margin: "2px 0 0", fontSize: 11, color: "#64748B" }}>CNPJ {COMPANY.cnpj}</p>
              <p style={{ margin: "1px 0 0", fontSize: 11, color: "#64748B" }}>Emitido em {issuedAt}</p>
            </div>
          </header>

          <div style={{ marginTop: 20, display: "flex", justifyContent: "space-between", gap: 12, background: "#F1F5F9", borderRadius: 10, padding: "12px 16px", borderLeft: `4px solid ${ORANGE}` }}>
            <div>
              <p style={{ margin: 0, fontSize: 10, color: "#64748B", textTransform: "uppercase", letterSpacing: 0.6 }}>Cliente</p>
              <p style={{ margin: "2px 0 0", fontSize: 16, fontWeight: 800, color: NAVY }}>{clientName}</p>
            </div>
            <div style={{ textAlign: "right" }}>
              <p style={{ margin: 0, fontSize: 10, color: "#64748B", textTransform: "uppercase", letterSpacing: 0.6 }}>Referência</p>
              <p style={{ margin: "2px 0 0", fontSize: 14, fontWeight: 700, color: NAVY }}>{periodTitle}</p>
              <p style={{ margin: 0, fontSize: 10, color: "#64748B" }}>{periodLabel}</p>
            </div>
          </div>

          {(sendDateLabel || effectiveDueLabel) && (
            <div style={{ marginTop: 12, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 10 }}>
              {sendDateLabel && (
                <div style={{ border: "1px solid #E2E8F0", borderTop: `3px solid ${CYAN}`, borderRadius: 8, padding: "9px 12px" }}>
                  <p style={{ margin: 0, fontSize: 10, color: "#64748B", textTransform: "uppercase", letterSpacing: 0.5 }}>Fechamento e envio</p>
                  <p style={{ margin: "3px 0 0", fontSize: 14, fontWeight: 800, color: NAVY }}>{sendDateLabel}</p>
                  <p style={{ margin: 0, fontSize: 10, color: "#64748B" }}>último dia útil do mês</p>
                </div>
              )}
              {effectiveDueLabel && (
                <div style={{ border: "1px solid #E2E8F0", borderTop: `3px solid ${ORANGE}`, borderRadius: 8, padding: "9px 12px" }}>
                  <p style={{ margin: 0, fontSize: 10, color: "#64748B", textTransform: "uppercase", letterSpacing: 0.5 }}>Vencimento</p>
                  <p style={{ margin: "3px 0 0", fontSize: 14, fontWeight: 800, color: NAVY }}>até {effectiveDueLabel}</p>
                  <p style={{ margin: 0, fontSize: 10, color: "#64748B" }}>
                    {dueEdited || !defaultDueIso ? "data de vencimento do pagamento" : `${dueBusinessDay ?? 5}º dia útil do mês seguinte`}
                    {contractNumber ? ` · contrato nº ${contractNumber}` : ""}
                  </p>
                </div>
              )}
            </div>
          )}

          {message.trim() && (
            <p style={{ margin: "16px 0 0", fontSize: 12.5, lineHeight: 1.55, color: "#334155", whiteSpace: "pre-wrap" }}>{message.trim()}</p>
          )}

          <div style={{ marginTop: 18, display: "grid", gridTemplateColumns: `repeat(${totals.atrasado > 0 ? 4 : 3}, 1fr)`, gap: 10 }}>
            {[
              { label: `Demandas do período (${finalPeriod.length})`, value: brl.format(totals.demandas), color: NAVY },
              { label: "Já pago", value: brl.format(totals.pago), color: "#047857" },
              { label: "A pagar", value: brl.format(totals.aPagar), color: BLUE },
              ...(totals.atrasado > 0 ? [{ label: "Em atraso", value: brl.format(totals.atrasado), color: "#B91C1C" }] : []),
            ].map((c) => (
              <div key={c.label} style={{ border: "1px solid #E2E8F0", borderTop: `3px solid ${c.color}`, borderRadius: 8, padding: "9px 12px" }}>
                <p style={{ margin: 0, fontSize: 10, color: "#64748B", textTransform: "uppercase", letterSpacing: 0.5 }}>{c.label}</p>
                <p style={{ margin: "3px 0 0", fontSize: 17, fontWeight: 800, color: c.color }}>{c.value}</p>
              </div>
            ))}
          </div>

          {(showPending || showPaid || showNoValue) &&
            renderTable(`Demandas solicitadas — ${periodTitle}`, "Serviços iniciados no período, com a previsão de pagamento de cada um.", visiblePeriod, "periodo")}
          {showOverdue && visibleOverdue.length > 0 &&
            renderTable("Pagamentos em atraso", "Parcelas de outros períodos que não foram pagas até a data prevista.", visibleOverdue, "atraso")}

          <div style={{ marginTop: 22, background: NAVY, borderRadius: 10, padding: "14px 18px", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
            <div>
              <p style={{ margin: 0, fontSize: 10, color: "#CBD5E1", textTransform: "uppercase", letterSpacing: 0.8 }}>Total a pagar</p>
              <p style={{ margin: "2px 0 0", fontSize: 11, color: "#94A3B8" }}>
                {finalOverdue.some((r) => !r.paid) && finalPeriod.some((r) => !r.paid)
                  ? "Demandas do período + pagamentos em atraso"
                  : finalOverdue.some((r) => !r.paid)
                    ? "Pagamentos em atraso"
                    : "Demandas do período"}
                {effectiveDueLabel ? ` · vencimento até ${effectiveDueLabel}` : ""}
              </p>
            </div>
            <p style={{ margin: 0, fontSize: 26, fontWeight: 800, color: "#FFFFFF" }}>{brl.format(totals.aPagar)}</p>
          </div>

          {paymentInfo.trim() && (
            <div style={{ marginTop: 14, border: `1px dashed ${CYAN}`, borderRadius: 8, padding: "10px 14px" }}>
              <p style={{ margin: 0, fontSize: 10, color: CYAN, fontWeight: 800, textTransform: "uppercase", letterSpacing: 0.6 }}>Dados para pagamento</p>
              <p style={{ margin: "4px 0 0", fontSize: 12, color: "#0F172A", whiteSpace: "pre-wrap" }}>{paymentInfo.trim()}</p>
            </div>
          )}

          <footer style={{ marginTop: 24, paddingTop: 12, borderTop: "1px solid #E2E8F0", display: "flex", justifyContent: "space-between", gap: 12, fontSize: 10, color: "#64748B" }}>
            <span>
              <b style={{ color: NAVY }}>{COMPANY.name}</b> · CNPJ {COMPANY.cnpj}
            </span>
            <span>
              {COMPANY.phone} · {COMPANY.email}
            </span>
          </footer>
        </div>
      </div>
    </div>
  );
}
