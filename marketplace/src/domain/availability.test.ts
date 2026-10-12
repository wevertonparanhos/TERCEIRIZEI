import { describe, expect, it } from "vitest";
import {
  addDays,
  availableSlots,
  formatLocalTime,
  hhmmToMinutes,
  isValidLocalDate,
  localToUtc,
  localWeekday,
  utcToLocalDate,
  type SlotQuery,
} from "./availability";

// 2026-10-14 é uma quarta-feira.
const base: SlotQuery = {
  date: "2026-10-14",
  windows: [{ weekday: 3, startMinute: 8 * 60, endMinute: 17 * 60 }],
  timeOff: [],
  busy: [],
  durationMinutes: 240,
  bufferMinutes: 30,
  stepMinutes: 60,
  minLeadHours: 12,
  now: new Date("2026-10-12T12:00:00Z"),
};

const times = (q: SlotQuery) => availableSlots(q).map((s) => formatLocalTime(s.start));

describe("fuso e datas (Brasília, UTC−3)", () => {
  it("converte horário local para UTC e de volta", () => {
    expect(localToUtc("2026-10-14", 8 * 60).toISOString()).toBe("2026-10-14T11:00:00.000Z");
    expect(formatLocalTime(new Date("2026-10-14T11:00:00Z"))).toBe("08:00");
    expect(utcToLocalDate(new Date("2026-10-15T02:30:00Z"))).toBe("2026-10-14"); // 23:30 local
  });

  it("dia da semana, soma de dias e validação de data", () => {
    expect(localWeekday("2026-10-14")).toBe(3);
    expect(addDays("2026-10-31", 1)).toBe("2026-11-01");
    expect(isValidLocalDate("2026-02-30")).toBe(false);
    expect(isValidLocalDate("2026-10-14")).toBe(true);
    expect(hhmmToMinutes("08:30")).toBe(510);
    expect(hhmmToMinutes("25:00")).toBeNull();
  });
});

describe("horários livres", () => {
  it("serviço inteiro cabe na janela de trabalho", () => {
    // 4h de serviço numa janela 08–17 com passo de 1h: 08 até 13.
    expect(times(base)).toEqual(["08:00", "09:00", "10:00", "11:00", "12:00", "13:00"]);
  });

  it("não oferece horários em dia sem expediente", () => {
    expect(times({ ...base, date: "2026-10-18" })).toEqual([]); // domingo
  });

  it("bloqueia sobreposição com outro pedido, incluindo o intervalo de deslocamento", () => {
    // Pedido existente 12:00–15:00 local (+30 min já embutidos em blocked_until).
    const busy = [{ start: localToUtc("2026-10-14", 12 * 60), end: localToUtc("2026-10-14", 15 * 60 + 30) }];
    // 08:00 → termina 12:00 + 30 min = 12:30 > 12:00 → conflita; só 07..? nenhum antes; depois só se couber até 17h.
    expect(times({ ...base, busy })).toEqual([]);
    expect(times({ ...base, busy, durationMinutes: 120 })).toEqual(["08:00", "09:00"]);
  });

  it("respeita folgas e antecedência mínima", () => {
    const timeOff = [{ start: localToUtc("2026-10-14", 0), end: localToUtc("2026-10-14", 11 * 60) }];
    expect(times({ ...base, timeOff })).toEqual(["11:00", "12:00", "13:00"]);
    // Agora = 14/10 06:00 local, antecedência 3h → a partir de 09:00.
    expect(times({ ...base, now: localToUtc("2026-10-14", 6 * 60), minLeadHours: 3 })).toEqual(["09:00", "10:00", "11:00", "12:00", "13:00"]);
  });

  it("suporta mais de uma janela no dia e alinha à grade", () => {
    const windows = [
      { weekday: 3, startMinute: 8 * 60 + 15, endMinute: 12 * 60 },
      { weekday: 3, startMinute: 14 * 60, endMinute: 18 * 60 },
    ];
    expect(times({ ...base, windows, durationMinutes: 120, stepMinutes: 30 })).toEqual([
      "08:30", "09:00", "09:30", "10:00", "14:00", "14:30", "15:00", "15:30", "16:00",
    ]);
  });

  it("devolve blockedUntil = fim + intervalo (usado pela trava do banco)", () => {
    const [first] = availableSlots(base);
    expect(first && formatLocalTime(first.end)).toBe("12:00");
    expect(first && formatLocalTime(first.blockedUntil)).toBe("12:30");
  });
});
