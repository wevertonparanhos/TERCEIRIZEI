import "server-only";
import { randomUUID } from "node:crypto";
import { canCustomerConfirm, canProviderFinish } from "@/domain/completion";
import type { SessionUser } from "./auth";
import { BookingError, transitionBookingTx } from "./booking";
import { db } from "./db";
import { notify } from "./notifications";
import { supabaseServer } from "./supabase";

/**
 * Execução do serviço e conclusão. Regra do negócio: o repasse ao profissional
 * só é liberado após FOTO/VÍDEO do serviço finalizado e/ou CONFIRMAÇÃO do cliente.
 */
export const EVIDENCE_BUCKET = "booking-evidence";
export const EVIDENCE_MAX_BYTES = 50 * 1024 * 1024;
export const EVIDENCE_MAX_FILES = 10;
const MIME: Record<string, { ext: string; type: "IMAGE" | "VIDEO" }> = {
  "image/jpeg": { ext: "jpg", type: "IMAGE" },
  "image/png": { ext: "png", type: "IMAGE" },
  "image/webp": { ext: "webp", type: "IMAGE" },
  "image/heic": { ext: "heic", type: "IMAGE" },
  "video/mp4": { ext: "mp4", type: "VIDEO" },
  "video/quicktime": { ext: "mov", type: "VIDEO" },
  "video/webm": { ext: "webm", type: "VIDEO" },
};

async function providerBooking(user: SessionUser, bookingId: string) {
  const provider = await db.providerProfile.findUnique({ where: { userId: user.id }, select: { id: true } });
  if (!provider) throw new BookingError("Perfil profissional não encontrado.");
  const booking = await db.booking.findFirst({
    where: { id: bookingId, providerId: provider.id },
    include: { _count: { select: { evidence: true } } },
  });
  if (!booking) throw new BookingError("Pedido não encontrado.");
  return booking;
}

/** Profissional inicia o atendimento (a partir de 2h antes do horário). */
export async function startService(user: SessionUser, bookingId: string) {
  const booking = await providerBooking(user, bookingId);
  if (booking.status !== "CONFIRMED") throw new BookingError("Só é possível iniciar um pedido confirmado (pago).");
  if (Date.now() < booking.scheduledStart.getTime() - 2 * 3_600_000) throw new BookingError("Você poderá iniciar a partir de 2 horas antes do horário agendado.");
  await db.$transaction(async (tx) => {
    await transitionBookingTx(tx, { bookingId, to: "IN_PROGRESS", actor: { id: user.id, type: "PROVIDER" }, reason: "Atendimento iniciado", where: { providerId: booking.providerId } });
    await notify(tx, booking.customerId, "SERVICE_STARTED", "Serviço iniciado", `O profissional iniciou o atendimento do pedido ${booking.code}.`, `/conta/pedidos/${booking.id}`);
  });
}

/**
 * Envia fotos/vídeos para o cofre privado. O upload usa a sessão do próprio
 * profissional — a política do Storage só aceita o profissional do pedido em andamento.
 */
export async function uploadEvidence(user: SessionUser, bookingId: string, files: File[]) {
  const booking = await providerBooking(user, bookingId);
  if (booking.status !== "IN_PROGRESS") throw new BookingError("Envie as fotos/vídeos com o serviço em andamento.");
  const valid = files.filter((f) => f.size > 0);
  if (valid.length === 0) throw new BookingError("Selecione ao menos um arquivo.");
  if (booking._count.evidence + valid.length > EVIDENCE_MAX_FILES) throw new BookingError(`Limite de ${EVIDENCE_MAX_FILES} arquivos por pedido.`);
  for (const f of valid) {
    if (!MIME[f.type]) throw new BookingError(`Formato não aceito: ${f.name}. Use JPG, PNG, WEBP, HEIC, MP4, MOV ou WEBM.`);
    if (f.size > EVIDENCE_MAX_BYTES) throw new BookingError(`${f.name} passa de 50 MB.`);
  }

  const supabase = await supabaseServer();
  for (const f of valid) {
    const meta = MIME[f.type]!;
    const path = `${booking.id}/${randomUUID()}.${meta.ext}`;
    const { error } = await supabase.storage.from(EVIDENCE_BUCKET).upload(path, f, { contentType: f.type, upsert: false });
    if (error) {
      console.error("[evidence] upload", error.message);
      throw new BookingError("Não foi possível enviar o arquivo. Tente novamente.");
    }
    await db.bookingEvidence.create({
      data: { bookingId: booking.id, uploadedBy: user.id, storagePath: path, mediaType: meta.type, mimeType: f.type, sizeBytes: f.size },
    });
  }
  return valid.length;
}

/** Profissional finaliza: exige ao menos 1 foto/vídeo (o banco também exige). */
export async function finishService(user: SessionUser, bookingId: string) {
  const booking = await providerBooking(user, bookingId);
  const rule = canProviderFinish({ status: booking.status, scheduledStart: booking.scheduledStart, evidenceCount: booking._count.evidence, providerFinishedAt: booking.providerFinishedAt });
  if (!rule.ok) throw new BookingError(rule.reason);
  await db.$transaction(async (tx) => {
    await transitionBookingTx(tx, {
      bookingId,
      to: "COMPLETION_PENDING",
      actor: { id: user.id, type: "PROVIDER" },
      reason: `Serviço finalizado com ${booking._count.evidence} foto(s)/vídeo(s)`,
      where: { providerId: booking.providerId },
      data: { providerFinishedAt: new Date() },
    });
    await notify(tx, booking.customerId, "SERVICE_FINISHED", "Serviço finalizado", `O profissional finalizou o pedido ${booking.code} e enviou fotos/vídeos. Confirme ou relate um problema em até 48h.`, `/conta/pedidos/${booking.id}`);
  });
}

/** Cliente confirma que o serviço foi feito → pedido concluído → repasse agendado (gatilho no banco). */
export async function confirmCompletion(user: SessionUser, bookingId: string) {
  const booking = await db.booking.findFirst({ where: { id: bookingId, customerId: user.id }, include: { provider: { select: { userId: true } }, _count: { select: { evidence: true } } } });
  if (!booking) throw new BookingError("Pedido não encontrado.");
  const rule = canCustomerConfirm({ status: booking.status, scheduledStart: booking.scheduledStart, evidenceCount: booking._count.evidence, providerFinishedAt: booking.providerFinishedAt });
  if (!rule.ok) throw new BookingError(rule.reason);
  await db.$transaction(async (tx) => {
    await transitionBookingTx(tx, { bookingId, to: "COMPLETED", actor: { id: user.id, type: "CUSTOMER" }, reason: "Conclusão confirmada pelo cliente", where: { customerId: user.id } });
    if (booking.provider) await notify(tx, booking.provider.userId, "SERVICE_COMPLETED", "Serviço concluído", `O cliente confirmou a conclusão do pedido ${booking.code}. Seu repasse foi liberado.`, "/profissional/financeiro");
  });
}

/** Cliente relata problema: pedido em análise e repasse retido (gatilho no banco). */
export async function reportProblem(user: SessionUser, bookingId: string, message: string) {
  const text = message.trim();
  if (text.length < 10) throw new BookingError("Descreva o problema (mínimo de 10 caracteres).");
  const booking = await db.booking.findFirst({ where: { id: bookingId, customerId: user.id }, include: { provider: { select: { userId: true } } } });
  if (!booking) throw new BookingError("Pedido não encontrado.");
  if (!["IN_PROGRESS", "COMPLETION_PENDING"].includes(booking.status)) throw new BookingError("Para este pedido, fale com o suporte.");
  await db.$transaction(async (tx) => {
    await transitionBookingTx(tx, { bookingId, to: "DISPUTED", actor: { id: user.id, type: "CUSTOMER" }, reason: `Problema relatado: ${text.slice(0, 200)}`, where: { customerId: user.id } });
    await tx.supportTicket.create({ data: { bookingId, openedBy: user.id, category: "QUALIDADE", subject: `Problema no pedido ${booking.code}`, message: text.slice(0, 2000) } });
    if (booking.provider) await notify(tx, booking.provider.userId, "BOOKING_DISPUTED", "Pedido em análise", `O cliente relatou um problema no pedido ${booking.code}. O repasse fica retido até a análise.`, "/profissional/pedidos");
  });
}

/** URLs temporárias (10 min) das evidências, para as partes do pedido. */
export async function evidenceUrls(bookingId: string) {
  const items = await db.bookingEvidence.findMany({ where: { bookingId }, orderBy: { createdAt: "asc" } });
  if (items.length === 0) return [];
  const supabase = await supabaseServer();
  const { data } = await supabase.storage.from(EVIDENCE_BUCKET).createSignedUrls(items.map((i) => i.storagePath), 600);
  return items.map((i, idx) => ({ id: i.id, mediaType: i.mediaType, url: data?.[idx]?.signedUrl ?? null, createdAt: i.createdAt }));
}
