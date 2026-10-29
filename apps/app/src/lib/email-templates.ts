const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://app.terceirizeibpo.com.br";

function layout(preheader: string, title: string, bodyHtml: string, ctaHref?: string, ctaLabel?: string): string {
  return `<!DOCTYPE html>
<html lang="pt-BR">
  <body style="margin:0;padding:0;background-color:#F8FAFC;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;">
    <span style="display:none;font-size:1px;color:#F8FAFC;">${preheader}</span>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#F8FAFC;padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="480" cellpadding="0" cellspacing="0" style="background-color:#FFFFFF;border-radius:16px;overflow:hidden;border:1px solid #E2E8F0;">
            <tr>
              <td style="background-color:#1B2558;padding:20px 28px;">
                <span style="color:#FFFFFF;font-size:16px;font-weight:800;">Terceirizei OS</span>
              </td>
            </tr>
            <tr>
              <td style="padding:28px;">
                <h1 style="margin:0 0 12px;color:#1B2558;font-size:18px;">${title}</h1>
                <div style="color:#334155;font-size:14px;line-height:1.6;">${bodyHtml}</div>
                ${
                  ctaHref
                    ? `<table role="presentation" cellpadding="0" cellspacing="0" style="margin-top:24px;">
                        <tr><td style="border-radius:8px;background-color:#14528D;">
                          <a href="${ctaHref}" style="display:inline-block;padding:11px 20px;color:#FFFFFF;font-size:14px;font-weight:600;text-decoration:none;">${ctaLabel}</a>
                        </td></tr>
                      </table>`
                    : ""
                }
              </td>
            </tr>
            <tr>
              <td style="padding:16px 28px;background-color:#F8FAFC;">
                <p style="margin:0;color:#94A3B8;font-size:11px;">Aviso automático do Terceirizei OS — não é preciso responder este e-mail.</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

export function deadlineReminderEmail(params: {
  processId: string;
  processNumber: number;
  description: string;
  clientName: string;
  dueAt: Date;
  overdue: boolean;
}) {
  const dateLabel = params.dueAt.toLocaleDateString("pt-BR", { timeZone: "UTC" });
  const title = params.overdue ? `Tarefa #${params.processNumber} está com o prazo vencido` : `Tarefa #${params.processNumber} vence em breve`;
  const body = `<p>${params.overdue ? "O prazo já passou" : "O prazo se aproxima"} para a tarefa <b>#${params.processNumber}</b> — ${params.description} (${params.clientName}).</p>
    <p>Prazo: <b>${dateLabel}</b></p>`;
  return {
    subject: title,
    html: layout(title, title, body, `${APP_URL}/processos/${params.processId}`, "Abrir tarefa"),
  };
}

export function deliverableRespondedEmail(params: {
  processId: string;
  processNumber: number;
  deliverableTitle: string;
  approved: boolean;
  note: string | null;
}) {
  const title = params.approved
    ? `Cliente aprovou o entregável "${params.deliverableTitle}"`
    : `Cliente pediu ajuste no entregável "${params.deliverableTitle}"`;
  const body = `<p>Na tarefa <b>#${params.processNumber}</b>, o entregável <b>${params.deliverableTitle}</b> foi ${
    params.approved ? "aprovado" : "recusado"
  } pelo cliente.</p>${params.note ? `<p>Observação do cliente: <i>"${params.note}"</i></p>` : ""}`;
  return {
    subject: title,
    html: layout(title, title, body, `${APP_URL}/processos/${params.processId}`, "Ver tarefa"),
  };
}

export function documentRequestedEmail(params: { label: string; deadline: Date | null }) {
  const title = "Um documento foi solicitado pela equipe";
  const body = `<p>A equipe da Terceirizei solicitou o envio de: <b>${params.label}</b>.</p>${
    params.deadline ? `<p>Prazo: <b>${params.deadline.toLocaleDateString("pt-BR", { timeZone: "UTC" })}</b></p>` : ""
  }`;
  return {
    subject: title,
    html: layout(title, title, body, `${APP_URL}/portal`, "Acessar portal"),
  };
}

export function documentReceivedEmail(params: { processId: string | null; processNumber: number | null; clientName: string; documentName: string }) {
  const title = `Cliente enviou um documento${params.processNumber ? ` na tarefa #${params.processNumber}` : ""}`;
  const body = `<p><b>${params.clientName}</b> enviou o documento <b>${params.documentName}</b>${
    params.processNumber ? ` na tarefa #${params.processNumber}` : ""
  }.</p>`;
  return {
    subject: title,
    html: layout(title, title, body, params.processId ? `${APP_URL}/processos/${params.processId}` : `${APP_URL}/clientes`, "Ver detalhes"),
  };
}

export function licenseReminderEmail(params: { name: string; clientName: string; expiresAt: Date; taskNumber: number }) {
  const title = `Documento "${params.name}" está vencendo`;
  const body = `<p>O documento <b>${params.name}</b> do cliente <b>${params.clientName}</b> vence em <b>${params.expiresAt.toLocaleDateString("pt-BR", { timeZone: "UTC" })}</b>.</p>
    <p>Uma tarefa de renovação (#${params.taskNumber}) já foi criada automaticamente.</p>`;
  return {
    subject: title,
    html: layout(title, title, body, `${APP_URL}/licencas`, "Ver Licenças e Certidões"),
  };
}

/** Convite ao Portal do Cliente ou redefinição de senha (o link serve para criar/trocar a senha). */
export function portalAccessEmail(params: { clientName: string; link: string; mode: "invite" | "reset" }) {
  const invite = params.mode === "invite";
  return {
    subject: invite ? "Seu acesso ao Portal do Cliente Terceirizei" : "Redefinir sua senha do Portal do Cliente",
    html: layout(
      invite ? "Crie sua senha e acesse o portal" : "Crie uma nova senha para o portal",
      invite ? "Bem-vindo(a) ao Portal do Cliente" : "Redefinição de senha",
      invite
        ? `<p>Olá, ${params.clientName}! A Terceirizei liberou o seu acesso ao <b>Portal do Cliente</b>, onde você acompanha suas demandas, envia pedidos e conversa com a equipe.</p><p>Clique no botão abaixo para criar a sua senha.</p>`
        : `<p>Olá, ${params.clientName}! Recebemos o pedido para redefinir a sua senha do <b>Portal do Cliente</b>.</p><p>Clique no botão abaixo para criar uma nova senha. Se não foi você, pode ignorar este e-mail.</p>`,
      params.link,
      invite ? "Criar minha senha" : "Criar nova senha"
    ),
  };
}

/** Redefinição de senha de quem usa o sistema (equipe). */
export function passwordResetEmail(params: { name: string; link: string }) {
  return {
    subject: "Redefinir sua senha do Terceirizei OS",
    html: layout(
      "Crie uma nova senha",
      "Redefinição de senha",
      `<p>Olá, ${params.name}! Recebemos o pedido para redefinir a sua senha do <b>Terceirizei OS</b>.</p><p>Clique no botão abaixo para criar uma nova senha. Se não foi você, pode ignorar este e-mail.</p>`,
      params.link,
      "Criar nova senha"
    ),
  };
}
