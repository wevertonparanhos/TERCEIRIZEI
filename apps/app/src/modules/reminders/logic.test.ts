import { describe, it, expect } from "vitest";
import { brtDay, daysLabel, isSnoozeOption, reminderTiming, snoozeTo, stageAlert } from "./logic";

const d = (iso: string) => new Date(`${iso}T00:00:00.000Z`);
const today = d("2026-11-23");

describe("reminderTiming", () => {
  it("separa atrasado, hoje e futuro", () => {
    expect(reminderTiming(d("2026-11-20"), today)).toBe("atrasado");
    expect(reminderTiming(d("2026-11-23"), today)).toBe("hoje");
    expect(reminderTiming(d("2026-11-24"), today)).toBe("futuro");
  });
});

describe("snoozeTo", () => {
  it("conta a partir de hoje", () => {
    expect(snoozeTo(today, "1d").toISOString().slice(0, 10)).toBe("2026-11-24");
    expect(snoozeTo(today, "3d").toISOString().slice(0, 10)).toBe("2026-11-26");
    expect(snoozeTo(today, "1w").toISOString().slice(0, 10)).toBe("2026-11-30");
  });

  it("reconhece só as opções válidas", () => {
    expect(isSnoozeOption("3d")).toBe(true);
    expect(isSnoozeOption("2d")).toBe(false);
  });
});

describe("brtDay", () => {
  it("usa o dia de Brasília", () => {
    expect(brtDay(new Date("2026-11-23T01:30:00.000Z")).toISOString().slice(0, 10)).toBe("2026-11-22");
    expect(brtDay(new Date("2026-11-23T15:00:00.000Z")).toISOString().slice(0, 10)).toBe("2026-11-23");
  });
});

describe("stageAlert", () => {
  const base = { alertAfterDays: 5, today, snoozedUntil: null };

  it("avisa só depois de passar do limite da etapa", () => {
    expect(stageAlert({ ...base, enteredAt: new Date("2026-11-18T15:00:00.000Z") })).toBeNull(); // 5 dias: ainda não
    expect(stageAlert({ ...base, enteredAt: new Date("2026-11-17T15:00:00.000Z") })).toEqual({ daysInStage: 6, overdueBy: 1 });
  });

  it("não avisa se a etapa não cobra ou sem data de entrada", () => {
    expect(stageAlert({ ...base, alertAfterDays: null, enteredAt: new Date("2026-10-01T15:00:00.000Z") })).toBeNull();
    expect(stageAlert({ ...base, enteredAt: null })).toBeNull();
  });

  it("respeita o adiamento, inclusive no último dia", () => {
    const entered = new Date("2026-11-01T15:00:00.000Z");
    expect(stageAlert({ ...base, enteredAt: entered, snoozedUntil: d("2026-11-23") })).toBeNull();
    expect(stageAlert({ ...base, enteredAt: entered, snoozedUntil: d("2026-11-22") })).not.toBeNull();
  });
});

describe("daysLabel", () => {
  it("usa singular e plural", () => {
    expect(daysLabel(1)).toBe("1 dia");
    expect(daysLabel(8)).toBe("8 dias");
  });
});
