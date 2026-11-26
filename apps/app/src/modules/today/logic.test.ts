import { describe, expect, it } from "vitest";
import { addDays, firstName, greetingFor, longDate, relativeDay, shortDate } from "./logic";

describe("tela Hoje", () => {
  it("saúda pelo horário de Brasília", () => {
    expect(greetingFor(new Date("2026-11-26T12:00:00Z"))).toBe("Bom dia"); // 09:00 BRT
    expect(greetingFor(new Date("2026-11-26T16:00:00Z"))).toBe("Boa tarde"); // 13:00 BRT
    expect(greetingFor(new Date("2026-11-26T22:30:00Z"))).toBe("Boa noite"); // 19:30 BRT
    expect(greetingFor(new Date("2026-11-27T02:00:00Z"))).toBe("Boa noite"); // 23:00 BRT do dia 26
  });

  it("usa o primeiro nome", () => {
    expect(firstName("  Weverton Paranhos ")).toBe("Weverton");
    expect(firstName("")).toBe("");
  });

  it("escreve a data por extenso e curta", () => {
    const day = new Date(Date.UTC(2026, 10, 26));
    expect(longDate(day)).toBe("quinta-feira, 26 de novembro");
    expect(shortDate(day)).toBe("26/11");
    expect(shortDate(addDays(day, 7))).toBe("03/12");
  });

  it("descreve a distância entre dias", () => {
    const today = new Date(Date.UTC(2026, 10, 26));
    expect(relativeDay(today, today)).toBe("hoje");
    expect(relativeDay(addDays(today, 1), today)).toBe("amanhã");
    expect(relativeDay(addDays(today, -1), today)).toBe("ontem");
    expect(relativeDay(addDays(today, 4), today)).toBe("em 4 dias");
    expect(relativeDay(addDays(today, -3), today)).toBe("há 3 dias");
    // instante no meio do dia conta pelo dia (UTC) da data
    expect(relativeDay(new Date("2026-11-27T15:00:00Z"), today)).toBe("amanhã");
  });
});
