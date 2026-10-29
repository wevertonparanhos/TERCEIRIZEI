import type { CSSProperties } from "react";
import type { ProposalContent } from "@/lib/validations/proposal";
import { BRAND, subtotalOf, totalOf } from "./content";

const { navy: NAVY, blue: BLUE, orange: ORANGE, cyan: CYAN } = BRAND;
const brl = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

const eyebrow: CSSProperties = { margin: 0, fontSize: 10, color: "#64748B", textTransform: "uppercase", letterSpacing: 0.6 };
const sectionTitle: CSSProperties = { margin: 0, fontSize: 13, fontWeight: 800, color: NAVY, letterSpacing: 0.4, textTransform: "uppercase" };

function formatDate(iso: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return "";
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

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
        * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      }
    `}</style>
  );
}

export function ProposalDocument({
  content,
  number,
  clientName,
  issuedAt,
  validUntil,
  isTemplate = false,
}: {
  content: ProposalContent;
  number?: number | null;
  clientName?: string | null;
  /** dd/mm/aaaa */
  issuedAt: string;
  /** dd/mm/aaaa — só existe depois que a proposta é enviada */
  validUntil?: string | null;
  isTemplate?: boolean;
}) {
  const subtotal = subtotalOf(content);
  const total = totalOf(content);
  const showClient = !content.hideClientContact && !!clientName;

  const conditions: { label: string; value: string }[] = [
    {
      label: "Início",
      value: content.startImmediately ? "Imediato" : content.startDate ? formatDate(content.startDate) : "A combinar",
    },
    ...(content.duration.trim() ? [{ label: "Duração", value: content.duration.trim() }] : []),
    {
      label: "Pagamento",
      value:
        content.paymentStructure === "PARCELADO" && content.installments
          ? `Parcelado em ${content.installments}x`
          : content.paymentStructure === "PARCELADO"
            ? "Parcelado"
            : "À vista",
    },
    ...(content.paymentMethods.length > 0 ? [{ label: "Formas de pagamento", value: content.paymentMethods.join(", ") }] : []),
    { label: "Validade", value: validUntil ? `até ${validUntil}` : `${content.validDays} dias após o envio` },
  ];

  const showPixInfo = content.paymentMethods.some((m) => m === "PIX" || m === "Transferência Bancária");

  return (
    <div
      className="proposal-doc mx-auto w-full max-w-[820px] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
      style={{ color: "#0F172A", fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif" }}
    >
      <div style={{ height: 6, background: `linear-gradient(90deg, ${NAVY}, ${BLUE} 55%, ${ORANGE})` }} />

      {content.coverUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={content.coverUrl} alt="" style={{ display: "block", width: "100%", height: 150, objectFit: "cover" }} />
      )}

      <div style={{ padding: "26px 32px 28px" }}>
        <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo-terceirizei.png" alt="Terceirizei — Consultoria e Gestão Empresarial" style={{ height: 62, width: "auto" }} />
          <div style={{ textAlign: "right" }}>
            <p style={{ margin: 0, fontSize: 15, fontWeight: 800, color: NAVY, letterSpacing: 0.5 }}>
              {isTemplate ? "MODELO DE PROPOSTA" : "PROPOSTA COMERCIAL"}
              {number ? ` Nº ${number}` : ""}
            </p>
            <p style={{ margin: "2px 0 0", fontSize: 11, color: "#64748B" }}>CNPJ {BRAND.cnpj}</p>
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
            <p style={eyebrow}>{showClient ? "Cliente" : "Proposta"}</p>
            <p style={{ margin: "2px 0 0", fontSize: 16, fontWeight: 800, color: NAVY }}>{showClient ? clientName : content.title}</p>
          </div>
          <div style={{ textAlign: "right" }}>
            <p style={eyebrow}>Investimento</p>
            <p style={{ margin: "2px 0 0", fontSize: 16, fontWeight: 800, color: BLUE }}>{brl.format(total)}</p>
          </div>
        </div>

        {showClient && (
          <h1 style={{ margin: "18px 0 0", fontSize: 20, fontWeight: 800, color: NAVY, lineHeight: 1.25 }}>{content.title}</h1>
        )}

        {content.intro.trim() && (
          <p style={{ margin: "14px 0 0", fontSize: 12.5, lineHeight: 1.6, color: "#334155", whiteSpace: "pre-wrap" }}>{content.intro.trim()}</p>
        )}

        <section style={{ marginTop: 22 }}>
          <h2 style={sectionTitle}>Escopo e investimento</h2>
          <p style={{ margin: "2px 0 8px", fontSize: 11, color: "#64748B" }}>Serviços incluídos nesta proposta.</p>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
            <thead>
              <tr style={{ background: NAVY, color: "#FFFFFF" }}>
                <th style={{ padding: "7px 10px", textAlign: "left", fontWeight: 600, width: 34 }}>#</th>
                <th style={{ padding: "7px 10px", textAlign: "left", fontWeight: 600 }}>Serviço</th>
                <th style={{ padding: "7px 10px", textAlign: "right", fontWeight: 600 }}>Valor</th>
              </tr>
            </thead>
            <tbody>
              {content.items.map((item, i) => (
                <tr key={i} style={{ background: i % 2 ? "#F8FAFC" : "#FFFFFF", borderBottom: "1px solid #E2E8F0" }}>
                  <td style={{ padding: "7px 10px", color: BLUE, fontWeight: 700, verticalAlign: "top" }}>{i + 1}</td>
                  <td style={{ padding: "7px 10px", color: "#0F172A" }}>
                    <b>{item.description}</b>
                    {item.detail.trim() && (
                      <span style={{ display: "block", marginTop: 2, color: "#64748B", fontSize: 11, whiteSpace: "pre-wrap" }}>{item.detail.trim()}</span>
                    )}
                  </td>
                  <td style={{ padding: "7px 10px", textAlign: "right", fontWeight: 700, whiteSpace: "nowrap", verticalAlign: "top" }}>
                    {brl.format(item.value)}
                  </td>
                </tr>
              ))}
              {content.items.length === 0 && (
                <tr>
                  <td colSpan={3} style={{ padding: 16, textAlign: "center", color: "#94A3B8" }}>
                    Nenhum serviço listado.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
          {content.discount > 0 && (
            <div style={{ marginTop: 8, display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 2, fontSize: 12, color: "#475569" }}>
              <span>Subtotal: {brl.format(subtotal)}</span>
              <span style={{ color: "#047857", fontWeight: 600 }}>Desconto: − {brl.format(content.discount)}</span>
            </div>
          )}
        </section>

        <div
          style={{
            marginTop: 16,
            background: NAVY,
            borderRadius: 10,
            padding: "14px 18px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 12,
          }}
        >
          <div>
            <p style={{ margin: 0, fontSize: 10, color: "#CBD5E1", textTransform: "uppercase", letterSpacing: 0.8 }}>Investimento total</p>
            <p style={{ margin: "2px 0 0", fontSize: 11, color: "#94A3B8" }}>
              {content.paymentStructure === "PARCELADO" && content.installments
                ? `${content.installments}x de ${brl.format(total / content.installments)}`
                : "Pagamento à vista"}
            </p>
          </div>
          <p style={{ margin: 0, fontSize: 26, fontWeight: 800, color: "#FFFFFF" }}>{brl.format(total)}</p>
        </div>

        <section style={{ marginTop: 22 }}>
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
            <p style={{ margin: "6px 0 0", fontSize: 12, lineHeight: 1.6, color: "#334155", whiteSpace: "pre-wrap" }}>{content.notes.trim()}</p>
          </section>
        )}

        {content.extraSections.map((s, i) => (
          <section key={i} style={{ marginTop: 18 }}>
            <h2 style={sectionTitle}>{s.title}</h2>
            <p style={{ margin: "6px 0 0", fontSize: 12, lineHeight: 1.6, color: "#334155", whiteSpace: "pre-wrap" }}>{s.body.trim()}</p>
          </section>
        ))}

        {showPixInfo && (
          <div style={{ marginTop: 16, border: `1px dashed ${CYAN}`, borderRadius: 8, padding: "10px 14px" }}>
            <p style={{ margin: 0, fontSize: 10, color: CYAN, fontWeight: 800, textTransform: "uppercase", letterSpacing: 0.6 }}>Dados para pagamento</p>
            <p style={{ margin: "4px 0 0", fontSize: 12, color: "#0F172A", whiteSpace: "pre-wrap" }}>{BRAND.paymentInfo}</p>
          </div>
        )}

        <p style={{ margin: "18px 0 0", fontSize: 11, fontStyle: "italic", color: "#64748B" }}>Documento válido após confirmação digital.</p>

        <footer
          style={{
            marginTop: 20,
            paddingTop: 12,
            borderTop: "1px solid #E2E8F0",
            display: "flex",
            justifyContent: "space-between",
            gap: 12,
            fontSize: 10,
            color: "#64748B",
          }}
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
