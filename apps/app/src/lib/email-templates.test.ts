import { describe, expect, it } from "vitest";
import {
  deadlineReminderEmail,
  deliverableRespondedEmail,
  documentRequestedEmail,
  documentReceivedEmail,
  licenseReminderEmail,
} from "@/lib/email-templates";

describe("deadlineReminderEmail", () => {
  it("indica prazo vencido quando overdue", () => {
    const { subject, html } = deadlineReminderEmail({
      processId: "p1",
      processNumber: 42,
      description: "Abertura de empresa",
      clientName: "Cliente A",
      dueAt: new Date("2026-09-10T00:00:00Z"),
      overdue: true,
    });
    expect(subject).toContain("#42");
    expect(subject).toContain("vencido");
    expect(html).toContain("/processos/p1");
    expect(html).toContain("Cliente A");
  });

  it("indica prazo próximo quando não overdue", () => {
    const { subject } = deadlineReminderEmail({
      processId: "p1",
      processNumber: 7,
      description: "X",
      clientName: "Y",
      dueAt: new Date("2026-09-10T00:00:00Z"),
      overdue: false,
    });
    expect(subject).toContain("vence em breve");
  });
});

describe("deliverableRespondedEmail", () => {
  it("varia o texto entre aprovado e recusado", () => {
    const approved = deliverableRespondedEmail({
      processId: "p1",
      processNumber: 1,
      deliverableTitle: "Relatório",
      approved: true,
      note: null,
    });
    expect(approved.subject).toContain("aprovou");

    const rejected = deliverableRespondedEmail({
      processId: "p1",
      processNumber: 1,
      deliverableTitle: "Relatório",
      approved: false,
      note: "Corrigir número",
    });
    expect(rejected.subject).toContain("ajuste");
    expect(rejected.html).toContain("Corrigir número");
  });
});

describe("documentRequestedEmail", () => {
  it("inclui o prazo quando informado", () => {
    const { html } = documentRequestedEmail({ label: "Contrato social", deadline: new Date("2026-10-01T00:00:00Z") });
    expect(html).toContain("Contrato social");
    expect(html).toContain("01/10/2026");
  });

  it("funciona sem prazo", () => {
    const { html } = documentRequestedEmail({ label: "RG", deadline: null });
    expect(html).toContain("RG");
  });
});

describe("documentReceivedEmail", () => {
  it("menciona a tarefa quando vinculado a um processo", () => {
    const { subject } = documentReceivedEmail({
      processId: "p1",
      processNumber: 9,
      clientName: "Cliente A",
      documentName: "Contrato.pdf",
    });
    expect(subject).toContain("#9");
  });
});

describe("licenseReminderEmail", () => {
  it("inclui nome do documento, cliente e número da tarefa criada", () => {
    const { html } = licenseReminderEmail({
      name: "Alvará de Funcionamento",
      clientName: "Cliente A",
      expiresAt: new Date("2026-10-15T00:00:00Z"),
      taskNumber: 5,
    });
    expect(html).toContain("Alvará de Funcionamento");
    expect(html).toContain("Cliente A");
    expect(html).toContain("#5");
  });
});
