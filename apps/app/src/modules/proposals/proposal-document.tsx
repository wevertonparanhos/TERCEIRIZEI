import type { CSSProperties } from "react";
import { DEFAULT_UNIT, type ProposalContent } from "@/lib/validations/proposal";
import { BRAND, formatDoc } from "./content";
import { fillClause, ordinal, type ClauseVars } from "./contract-clauses";

const { navy: NAVY, blue: BLUE, orange: ORANGE, cyan: CYAN } = BRAND;
const brl = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

const eyebrow: CSSProperties = { margin: 0, fontSize: 10, color: "#64748B", textTransform: "uppercase", letterSpacing: 0.6 };
const sectionTitle: CSSProperties = { margin: 0, fontSize: 13, fontWeight: 800, color: NAVY, letterSpacing: 0.4, textTransform: "uppercase" };
const bodyText: CSSProperties = { margin: "6px 0 0", fontSize: 12, lineHeight: 1.6, color: "#334155", whiteSpace: "pre-wrap" };

export type DocumentClient = {
  name: string;
  doc?: string | null;
  address?: string | null;
  zipCode?: string | null;
  city?: string | null;
  state?: string | null;
  email?: string | null;
};

export type Acceptance = { name: string; at: string; ip?: string | null };

/** Só aparece no PDF/impressão: esconde todo o resto da página e deixa o documento em A4. */
export function ProposalPrintStyles() {
  return (
    <style>{`
      @media print {
        @page { size: A4; margin: 12mm; }
        html, body { background: #fff !important; }
        body * { visibility: hidden !important; }
        .proposal-doc, .proposal-doc * { visibility: visible !important; }
        .proposal-doc { position: absolute !important; left: 0; top: 0; width: 100% !important; max-width: none !important; box-shadow: none !important; border: none !important; border-radius: 0 !important; }
        .proposal-doc .no-break { break-inside: avoid; page-break-inside: avoid; }
        * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      }
    `}</style>
  );
}

function Party({ role, name, lines }: { role: string; name: string; lines: string[] }) {
  return (
    <div style={{ flex: 1, minWidth: 220, border: "1px solid #E2E8F0", borderTop: `3px solid ${BLUE}`, borderRadius: 8, padding: "9px 12px" }}>
      <p style={eyebrow}>{role}</p>
      <p style={{ margin: "3px 0 0", fontSize: 13, fontWeight: 800, color: NAVY }}>{name}</p>
      {lines.map((l) => (
        <p key={l} style={{ margin: "1px 0 0", fontSize: 11, color: "#475569" }}>
          {l}
        </p>
      ))}
    </div>
  );
}

export function ProposalDocument({
  content,
  number,
  client,
  issuedAt,
  validUntil,
  acceptance,
  isTemplate = false,
}: {
  content: ProposalContent;
  number?: number | null;
  client?: DocumentClient | null;
  /** dd/mm/aaaa */
  issuedAt: string;
  /** dd/mm/aaaa — só existe depois que a proposta é enviada */
  validUntil?: string | null;
  /** preenchido quando o cliente já aceitou digitalmente */
  acceptance?: Acceptance | null;
  isTemplate?: boolean;
}) {
  const hideContact = content.hideClientContact;
  const vars: ClauseVars = {
    diaVencimento: content.dueBusinessDay,
    multa: content.lateFeePercent,
    juros: content.lateInterestPercent,
    aviso: content.noticeDays,
    termMonths: content.termMonths,
    foro: content.foro,
  };

  const clientLines = client
    ? [
        client.doc ? `CPF/CNPJ: ${formatDoc(client.doc)}` : "",
        !hideContact && client.address ? [client.address, client.zipCode].filter(Boolean).join(" — CEP ") : "",
        !hideContact && (client.city || client.state) ? [client.city, client.state].filter(Boolean).join("/") : "",
        !hideContact && client.email ? client.email : "",
      ].filter(Boolean)
    : ["Dados do cliente serão preenchidos ao criar a proposta."];

  const dueLabel = `${content.dueBusinessDay}º dia útil do mês seguinte`;
  const conditions: { label: string; value: string }[] = [
    { label: "Faturamento", value: "Último dia útil do mês" },
    { label: "Vencimento", value: `Até o ${dueLabel}` },
    ...(content.paymentMethods.length > 0 ? [{ label: "Formas de pagamento", value: content.paymentMethods.join(", ") }] : []),
    { label: "Vigência", value: content.termMonths ? `${content.termMonths} ${content.termMonths === 1 ? "mês" : "meses"}, renovável` : "Prazo indeterminado" },
    { label: "Validade da proposta", value: validUntil ? `até ${validUntil}` : `${content.validDays} dias após o envio` },
  ];

  const showPixInfo = content.paymentMethods.some((m) => m === "PIX" || m === "Transferência Bancária");
  const clauses = [...content.clauses, ...content.extraSections.map((s) => ({ key: s.title, title: s.title.toUpperCase(), body: s.body, mandatory: false }))];
  const clientLabel = client?.name ?? "CONTRATANTE";

  return (
    <div
      className="proposal-doc mx-auto w-full max-w-[820px] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
      style={{ color: "#0F172A", fontFamily: "'Montserrat', 'Inter', system-ui, sans-serif" }}
    >
      <div style={{ height: 6, background: `linear-gradient(90deg, ${NAVY}, ${BLUE} 55%, ${ORANGE})` }} />

      {content.coverUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={content.coverUrl} alt="" style={{ display: "block", width: "100%", height: 150, objectFit: "cover" }} />
      )}

      <div style={{ padding: "26px clamp(14px, 4vw, 32px) 28px" }}>
        <header style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo-terceirizei.png" alt="Terceirizei — Consultoria e Gestão Empresarial" style={{ height: 62, width: "auto" }} />
          <div style={{ textAlign: "right" }}>
            <p style={{ margin: 0, fontSize: 15, fontWeight: 800, color: NAVY, letterSpacing: 0.5 }}>
              {isTemplate ? "MODELO DE PROPOSTA E CONTRATO" : "PROPOSTA E CONTRATO"}
              {number ? ` Nº ${number}` : ""}
            </p>
            <p style={{ margin: "2px 0 0", fontSize: 11, color: "#64748B" }}>Prestação de serviços · CNPJ {BRAND.cnpj}</p>
            <p style={{ margin: "1px 0 0", fontSize: 11, color: "#64748B" }}>Emitida em {issuedAt}</p>
          </div>
        </header>

        <div
          style={{
            marginTop: 20,
            display: "flex",
            justifyContent: "space-between",
            gap: 12,
            background: "#F1F5F9",
            borderRadius: 10,
            padding: "12px 16px",
            borderLeft: `4px solid ${ORANGE}`,
          }}
        >
          <div>
            <p style={eyebrow}>Cliente</p>
            <p style={{ margin: "2px 0 0", fontSize: 16, fontWeight: 800, color: NAVY }}>{client?.name ?? "A definir"}</p>
          </div>
          <div style={{ textAlign: "right" }}>
            <p style={eyebrow}>Pagamento</p>
            <p style={{ margin: "2px 0 0", fontSize: 14, fontWeight: 700, color: BLUE }}>Até o {dueLabel}</p>
          </div>
        </div>

        <h1 style={{ margin: "18px 0 0", fontSize: 20, fontWeight: 800, color: NAVY, lineHeight: 1.25 }}>{content.title}</h1>

        {content.intro.trim() && (
          <p style={{ margin: "10px 0 0", fontSize: 12.5, lineHeight: 1.6, color: "#334155", whiteSpace: "pre-wrap" }}>{content.intro.trim()}</p>
        )}

        <section style={{ marginTop: 22 }}>
          <h2 style={sectionTitle}>Das partes</h2>
          <div style={{ marginTop: 8, display: "flex", flexWrap: "wrap", gap: 10 }}>
            <Party
              role="Contratada"
              name={BRAND.name}
              lines={[`CNPJ: ${BRAND.cnpj}`, `${BRAND.email} · ${BRAND.phone}`]}
            />
            <Party role="Contratante" name={client?.name ?? "A definir"} lines={clientLines} />
          </div>
        </section>

        <section style={{ marginTop: 22 }}>
          <h2 style={sectionTitle}>Tabela de serviços e valores</h2>
          <p style={{ margin: "2px 0 8px", fontSize: 11, color: "#64748B" }}>
            Serviços oferecidos e o valor de cada um, cobrado quando solicitado. Não há valor global.
          </p>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
            <thead>
              <tr style={{ background: NAVY, color: "#FFFFFF" }}>
                <th style={{ padding: "7px 10px", textAlign: "left", fontWeight: 600, width: 34 }}>#</th>
                <th style={{ padding: "7px 10px", textAlign: "left", fontWeight: 600 }}>Serviço</th>
                <th style={{ padding: "7px 10px", textAlign: "left", fontWeight: 600 }}>Cobrança</th>
                <th style={{ padding: "7px 10px", textAlign: "right", fontWeight: 600 }}>Valor</th>
              </tr>
            </thead>
            <tbody>
              {content.items.map((item, i) => (
                <tr key={i} className="no-break" style={{ background: i % 2 ? "#F8FAFC" : "#FFFFFF", borderBottom: "1px solid #E2E8F0" }}>
                  <td style={{ padding: "7px 10px", color: BLUE, fontWeight: 700, verticalAlign: "top" }}>{i + 1}</td>
                  <td style={{ padding: "7px 10px", color: "#0F172A" }}>
                    <b>{item.description}</b>
                    {item.detail.trim() && (
                      <span style={{ display: "block", marginTop: 2, color: "#64748B", fontSize: 11, whiteSpace: "pre-wrap" }}>{item.detail.trim()}</span>
                    )}
                  </td>
                  <td style={{ padding: "7px 10px", color: "#475569", whiteSpace: "nowrap", verticalAlign: "top" }}>{item.unit.trim() || DEFAULT_UNIT}</td>
                  <td style={{ padding: "7px 10px", textAlign: "right", fontWeight: 700, whiteSpace: "nowrap", verticalAlign: "top" }}>
                    {brl.format(item.value)}
                  </td>
                </tr>
              ))}
              {content.items.length === 0 && (
                <tr>
                  <td colSpan={4} style={{ padding: 16, textAlign: "center", color: "#94A3B8" }}>
                    Nenhum serviço listado.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </section>

        <div
          className="no-break"
          style={{ marginTop: 16, background: NAVY, borderRadius: 10, padding: "14px 18px", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}
        >
          <div>
            <p style={{ margin: 0, fontSize: 10, color: "#CBD5E1", textTransform: "uppercase", letterSpacing: 0.8 }}>Como funciona a cobrança</p>
            <p style={{ margin: "3px 0 0", fontSize: 12, color: "#E2E8F0", lineHeight: 1.45 }}>
              Os serviços solicitados no mês são enviados no Relatório do Cliente, no último dia útil do mês.
            </p>
          </div>
          <p style={{ margin: 0, fontSize: 15, fontWeight: 800, color: "#FFFFFF", textAlign: "right", whiteSpace: "nowrap" }}>Pagar até o {dueLabel}</p>
        </div>

        <section className="no-break" style={{ marginTop: 22 }}>
          <h2 style={sectionTitle}>Condições</h2>
          <div style={{ marginTop: 8, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 10 }}>
            {conditions.map((c) => (
              <div key={c.label} style={{ border: "1px solid #E2E8F0", borderTop: `3px solid ${BLUE}`, borderRadius: 8, padding: "9px 12px" }}>
                <p style={{ ...eyebrow, letterSpacing: 0.5 }}>{c.label}</p>
                <p style={{ margin: "3px 0 0", fontSize: 13, fontWeight: 800, color: NAVY }}>{c.value}</p>
              </div>
            ))}
          </div>
        </section>

        {content.notes.trim() && (
          <section style={{ marginTop: 18 }}>
            <h2 style={sectionTitle}>Observações</h2>
            <p style={bodyText}>{content.notes.trim()}</p>
          </section>
        )}

        <section style={{ marginTop: 26 }}>
          <h2 style={{ ...sectionTitle, fontSize: 14 }}>Contrato de prestação de serviços</h2>
          <p style={{ margin: "2px 0 0", fontSize: 11, color: "#64748B" }}>
            Pelo presente instrumento, as partes acima identificadas ajustam as cláusulas a seguir.
          </p>
          {clauses.map((c, i) => (
            <div key={c.key} className="no-break" style={{ marginTop: 14 }}>
              <h3 style={{ margin: 0, fontSize: 12, fontWeight: 800, color: NAVY }}>
                CLÁUSULA {ordinal(i + 1)} — {c.title}
              </h3>
              <p style={bodyText}>{fillClause(c.body, vars).trim()}</p>
            </div>
          ))}
        </section>

        {showPixInfo && (
          <div className="no-break" style={{ marginTop: 18, border: `1px dashed ${CYAN}`, borderRadius: 8, padding: "10px 14px" }}>
            <p style={{ margin: 0, fontSize: 10, color: CYAN, fontWeight: 800, textTransform: "uppercase", letterSpacing: 0.6 }}>Dados para pagamento</p>
            <p style={{ margin: "4px 0 0", fontSize: 12, color: "#0F172A", whiteSpace: "pre-wrap" }}>{BRAND.paymentInfo}</p>
          </div>
        )}

        <section className="no-break" style={{ marginTop: 24 }}>
          <h2 style={sectionTitle}>Aceite e assinatura</h2>
          <div style={{ marginTop: 8, display: "flex", flexWrap: "wrap", gap: 10 }}>
            <div style={{ flex: 1, minWidth: 220, borderTop: `2px solid ${NAVY}`, paddingTop: 6 }}>
              <p style={{ margin: 0, fontSize: 12, fontWeight: 800, color: NAVY }}>{BRAND.name}</p>
              <p style={{ margin: "1px 0 0", fontSize: 11, color: "#64748B" }}>CONTRATADA · CNPJ {BRAND.cnpj}</p>
              <p style={{ margin: "1px 0 0", fontSize: 11, color: "#64748B" }}>Proposta emitida em {issuedAt}</p>
            </div>
            <div style={{ flex: 1, minWidth: 220, borderTop: `2px solid ${acceptance ? "#047857" : "#94A3B8"}`, paddingTop: 6 }}>
              <p style={{ margin: 0, fontSize: 12, fontWeight: 800, color: NAVY }}>{clientLabel}</p>
              <p style={{ margin: "1px 0 0", fontSize: 11, color: "#64748B" }}>CONTRATANTE</p>
              {acceptance ? (
                <p style={{ margin: "3px 0 0", fontSize: 11, color: "#047857", fontWeight: 700 }}>
                  Aceito digitalmente por {acceptance.name} em {acceptance.at}
                  {acceptance.ip ? ` · IP ${acceptance.ip}` : ""}
                </p>
              ) : (
                <p style={{ margin: "3px 0 0", fontSize: 11, color: "#92400E" }}>Aguardando aceite digital.</p>
              )}
            </div>
          </div>
        </section>

        <p style={{ margin: "18px 0 0", fontSize: 11, fontStyle: "italic", color: "#64748B" }}>Documento válido após confirmação digital.</p>

        <footer
          style={{ marginTop: 20, paddingTop: 12, borderTop: "1px solid #E2E8F0", display: "flex", justifyContent: "space-between", gap: 12, fontSize: 10, color: "#64748B" }}
        >
          <span>
            <b style={{ color: NAVY }}>{BRAND.name}</b> · CNPJ {BRAND.cnpj}
          </span>
          <span>
            {BRAND.phone} · {BRAND.email}
          </span>
        </footer>
      </div>
    </div>
  );
}
