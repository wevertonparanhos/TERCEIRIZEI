import "server-only";
import { addDays, availableSlots, localToUtc, type Slot } from "@/domain/availability";
import { SLOT_HOLDING_STATUSES } from "@/domain/booking-state";
import { db } from "./db";
import { getSettings } from "./settings";

/** Libera horários de reservas vencidas (o pg_cron também faz isso a cada minuto). */
export async function expireStaleHolds() {
  await db.$queryRaw`select public.expire_stale_holds()`;
}

/** Horários livres de um profissional num dia, para um serviço de `durationMinutes`. */
export async function getProviderSlots(providerId: string, date: string, durationMinutes: number): Promise<Slot[]> {
  await expireStaleHolds();
  const dayStart = localToUtc(date, 0);
  const dayEnd = localToUtc(addDays(date, 1), 0);
  // Margem de 1 dia para pegar pedidos/folgas que atravessam a meia-noite.
  const from = new Date(dayStart.getTime() - 86_400_000);
  const to = new Date(dayEnd.getTime() + 86_400_000);

  const [provider, settings, busy, timeOff] = await Promise.all([
    db.providerProfile.findUnique({
      where: { id: providerId },
      select: { bufferMinutes: true, availability: { select: { weekday: true, startMinute: true, endMinute: true } } },
    }),
    getSettings(),
    db.booking.findMany({
      where: {
        providerId,
        status: { in: [...SLOT_HOLDING_STATUSES] },
        scheduledStart: { lt: to },
        blockedUntil: { gt: from },
      },
      select: { scheduledStart: true, blockedUntil: true },
    }),
    db.providerTimeOff.findMany({
      where: { providerId, startsAt: { lt: to }, endsAt: { gt: from } },
      select: { startsAt: true, endsAt: true },
    }),
  ]);
  if (!provider) return [];

  return availableSlots({
    date,
    windows: provider.availability,
    timeOff: timeOff.map((t) => ({ start: t.startsAt, end: t.endsAt })),
    busy: busy.map((b) => ({ start: b.scheduledStart, end: b.blockedUntil })),
    durationMinutes,
    bufferMinutes: provider.bufferMinutes,
    stepMinutes: settings.slotStepMinutes,
    minLeadHours: settings.minLeadHours,
    now: new Date(),
  });
}

/**
 * Horários livres de vários profissionais em vários dias, com 4 consultas no
 * total (usado na busca para filtrar por data e ordenar por disponibilidade).
 */
export async function countSlotsForProviders(
  providers: { id: string; durationMinutes: number }[],
  dates: string[],
): Promise<Map<string, Record<string, number>>> {
  const result = new Map<string, Record<string, number>>();
  if (providers.length === 0 || dates.length === 0) return result;
  await expireStaleHolds();

  const sorted = [...dates].sort();
  const from = new Date(localToUtc(sorted[0]!, 0).getTime() - 86_400_000);
  const to = new Date(localToUtc(addDays(sorted[sorted.length - 1]!, 1), 0).getTime() + 86_400_000);
  const ids = providers.map((p) => p.id);

  const [profiles, settings, busy, timeOff] = await Promise.all([
    db.providerProfile.findMany({
      where: { id: { in: ids } },
      select: { id: true, bufferMinutes: true, availability: { select: { weekday: true, startMinute: true, endMinute: true } } },
    }),
    getSettings(),
    db.booking.findMany({
      where: { providerId: { in: ids }, status: { in: [...SLOT_HOLDING_STATUSES] }, scheduledStart: { lt: to }, blockedUntil: { gt: from } },
      select: { providerId: true, scheduledStart: true, blockedUntil: true },
    }),
    db.providerTimeOff.findMany({
      where: { providerId: { in: ids }, startsAt: { lt: to }, endsAt: { gt: from } },
      select: { providerId: true, startsAt: true, endsAt: true },
    }),
  ]);

  const now = new Date();
  for (const p of providers) {
    const profile = profiles.find((x) => x.id === p.id);
    if (!profile) continue;
    const counts: Record<string, number> = {};
    for (const date of dates) {
      counts[date] = availableSlots({
        date,
        windows: profile.availability,
        timeOff: timeOff.filter((t) => t.providerId === p.id).map((t) => ({ start: t.startsAt, end: t.endsAt })),
        busy: busy.filter((b) => b.providerId === p.id).map((b) => ({ start: b.scheduledStart, end: b.blockedUntil })),
        durationMinutes: p.durationMinutes,
        bufferMinutes: profile.bufferMinutes,
        stepMinutes: settings.slotStepMinutes,
        minLeadHours: settings.minLeadHours,
        now,
      }).length;
    }
    result.set(p.id, counts);
  }
  return result;
}
