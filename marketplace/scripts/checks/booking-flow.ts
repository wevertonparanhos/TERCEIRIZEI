/**
 * Verificação ponta a ponta do fluxo de contratação contra o banco real,
 * usando o código de produção (src/server/booking.ts) e uma cliente FICTÍCIA.
 * Executar: npx tsx --conditions=react-server --env-file=.env.local scripts/checks/booking-flow.ts
 * Os pedidos criados são CANCELADOS no fim (histórico é imutável, não é apagado).
 */
import { addDays, formatLocalTime, utcToLocalDate } from "@/domain/availability";
import { acceptBooking, BookingError, createBooking, declineBooking, transitionBooking } from "@/server/booking";
import { db } from "@/server/db";
import { getProviderSlots } from "@/server/scheduling";

const DEMO_CUSTOMER_EMAIL = "demo.cliente1@exemplo.invalid";
const created: string[] = [];
const log = (ok: boolean, msg: string) => console.log(`${ok ? "✔" : "✘"} ${msg}`);

async function main() {
  const customer = await db.user.findUniqueOrThrow({ where: { email: DEMO_CUSTOMER_EMAIL } });
  if (!customer.isDemo) throw new Error("Abortado: usuário de teste não é de demonstração.");
  const address = await db.address.findFirstOrThrow({ where: { userId: customer.id } });
  const ana = await db.providerProfile.findFirstOrThrow({ where: { user: { email: "demo.ana@exemplo.invalid" } } });
  const service = await db.service.findUniqueOrThrow({ where: { slug: "limpeza-basica" }, include: { packages: true, addons: true } });
  const pkg = service.packages.find((p) => p.slug === "ate-2-quartos")!;
  const forno = service.addons.find((a) => a.name === "Limpeza de forno")!;
  const janelas = service.addons.find((a) => a.name === "Janelas acessíveis")!;
  const sessionUser = { id: customer.id, email: customer.email, name: customer.name, phone: customer.phone, role: customer.role, status: customer.status };

  // Próximo dia útil com horário livre.
  let date = addDays(utcToLocalDate(new Date()), 2);
  let slots = await getProviderSlots(ana.id, date, 240 + 30 + 20);
  for (let i = 0; slots.length < 2 && i < 10; i++) {
    date = addDays(date, 1);
    slots = await getProviderSlots(ana.id, date, 240 + 30 + 20);
  }
  const slot = slots[0]!;
  const base = {
    serviceId: service.id, providerId: ana.id, packageId: pkg.id, addons: { [forno.id]: 1, [janelas.id]: 2 },
    addressId: address.id, date, start: slot.start.toISOString(), hasPets: false, notes: "TESTE AUTOMATIZADO", acceptTerms: true as const,
  };

  // 1) Pedido válido
  const b1 = await createBooking(sessionUser, base);
  created.push(b1.id);
  const ana180 = 18000, forno35 = 3500, jan10 = 1000;
  const expectedSubtotal = ana180 + forno35 + 2 * jan10;
  log(b1.status === "AWAITING_PROVIDER", `solicitação ${b1.code} criada aguardando aceite para ${date} ${formatLocalTime(slot.start)}`);
  log(b1.providerSubtotalCents === expectedSubtotal && b1.totalCents === Math.round(expectedSubtotal * 1.2),
    `preço recalculado no servidor: profissional R$ ${b1.providerSubtotalCents / 100} + 20% = cliente R$ ${b1.totalCents / 100}`);
  log(!!b1.providerResponseDeadline && b1.providerResponseDeadline > new Date(), `horário segurado até o prazo de resposta ${b1.providerResponseDeadline?.toISOString()}`);

  // Cliente não pode "se aceitar" nem pular para pago
  for (const [to, label] of [["AWAITING_PAYMENT", "aceitar o próprio pedido"], ["CONFIRMED", "confirmar sem aceite"]] as const) {
    try {
      await transitionBooking({ bookingId: b1.id, to, actor: { id: customer.id, type: "CUSTOMER" } });
      log(false, `cliente conseguiu ${label} (falha)`);
    } catch (e) {
      log(true, `cliente tentando ${label}: recusado ("${(e as Error).message}")`);
    }
  }
  // Outro profissional não aceita pedido alheio
  const bruno = await db.providerProfile.findFirstOrThrow({ where: { user: { email: "demo.bruno@exemplo.invalid" } } });
  try {
    await acceptBooking(bruno.id, bruno.userId, b1.id);
    log(false, "outro profissional aceitou pedido alheio (falha)");
  } catch (e) {
    log(true, `outro profissional tentando aceitar: recusado ("${(e as Error).message}")`);
  }
  // Profissional certo aceita → abre prazo de pagamento
  const accepted = await acceptBooking(ana.id, ana.userId, b1.id);
  const afterAccept = await db.booking.findUniqueOrThrow({ where: { id: b1.id } });
  log(accepted.status === "AWAITING_PAYMENT" && !!afterAccept.holdExpiresAt, `profissional aceitou → aguardando pagamento até ${afterAccept.holdExpiresAt?.toISOString()}`);

  // 2) Mesmo horário de novo → recusado (já ocupado)
  try {
    const dup = await createBooking(sessionUser, base);
    created.push(dup.id);
    log(false, "reserva duplicada ACEITA (falha)");
  } catch (e) {
    log(e instanceof BookingError, `reserva do mesmo horário recusada: "${(e as Error).message}"`);
  }

  // 3) Duas reservas SIMULTÂNEAS de outro horário → só uma passa
  let raceDate = addDays(date, 1);
  let raceSlots = await getProviderSlots(ana.id, raceDate, 290);
  for (let i = 0; raceSlots.length === 0 && i < 10; i++) {
    raceDate = addDays(raceDate, 1);
    raceSlots = await getProviderSlots(ana.id, raceDate, 290);
  }
  const other = { ...base, date: raceDate, start: raceSlots[0]!.start.toISOString() };
  const race = await Promise.allSettled([createBooking(sessionUser, other), createBooking(sessionUser, other)]);
  race.forEach((r) => r.status === "rejected" && console.log("   motivo da recusa:", (r.reason as Error).message));
  race.forEach((r) => r.status === "fulfilled" && created.push(r.value.id));
  const won = race.filter((r) => r.status === "fulfilled").length;
  log(won === 1, `corrida de reservas simultâneas: ${won} aceita(s), ${race.length - won} recusada(s)`);

  // 4) Adulterações vindas do navegador
  const tamper = async (label: string, input: typeof base) => {
    try {
      const x = await createBooking(sessionUser, input);
      created.push(x.id);
      log(false, `${label}: ACEITO (falha)`);
    } catch (e) {
      log(true, `${label}: recusado ("${(e as Error).message}")`);
    }
  };
  await tamper("horário inventado fora da agenda (03:00)", { ...base, start: new Date(`${date}T06:00:00Z`).toISOString() });
  await tamper("adicional fixo com quantidade 5", { ...base, start: slots[1]!.start.toISOString(), addons: { [forno.id]: 5 } });
  await tamper("endereço de outra pessoa", { ...base, start: slots[1]!.start.toISOString(), addressId: (await db.address.findFirstOrThrow({ where: { userId: { not: customer.id } } })).id });

  // 4b) Recusa libera o horário na hora
  const winner = race.find((r) => r.status === "fulfilled");
  if (winner && winner.status === "fulfilled") {
    await declineBooking(ana.id, ana.userId, winner.value.id, "Teste automatizado de recusa");
    const freed = await getProviderSlots(ana.id, raceDate, 290);
    log(freed.some((x) => x.start.getTime() === raceSlots[0]!.start.getTime()), "profissional recusou → horário voltou a ficar livre");
  }

  // 5) Cliente cancela → horário volta a ficar livre
  await transitionBooking({ bookingId: b1.id, to: "CANCELLED", actor: { id: customer.id, type: "CUSTOMER" }, reason: "Teste automatizado", where: { customerId: customer.id } });
  const again = await getProviderSlots(ana.id, date, 240 + 30 + 20);
  log(again.some((s) => s.start.getTime() === slot.start.getTime()), "após cancelar, o horário voltou a aparecer como livre");
}

main()
  .catch((e) => {
    console.error("ERRO", e);
    process.exitCode = 1;
  })
  .finally(async () => {
    for (const id of created) {
      const b = await db.booking.findUnique({ where: { id } });
      if (b && (b.status === "AWAITING_PAYMENT" || b.status === "AWAITING_PROVIDER")) {
        await transitionBooking({ bookingId: id, to: "CANCELLED", actor: { id: b.customerId, type: "CUSTOMER" }, reason: "Limpeza de teste automatizado" });
      }
    }
    await db.$disconnect();
  });
