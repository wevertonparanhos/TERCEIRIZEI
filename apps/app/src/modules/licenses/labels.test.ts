import { describe, expect, it } from "vitest";
import { getLicenseStatus, isWithinReminderWindow } from "@/modules/licenses/labels";

describe("getLicenseStatus", () => {
  const now = new Date("2026-09-16T12:00:00Z");

  it("retorna VENCIDO quando o vencimento já passou", () => {
    expect(getLicenseStatus(new Date("2026-09-01T00:00:00Z"), 30, now)).toBe("VENCIDO");
  });

  it("retorna VENCE_EM_BREVE quando está dentro da janela de aviso", () => {
    expect(getLicenseStatus(new Date("2026-09-30T00:00:00Z"), 30, now)).toBe("VENCE_EM_BREVE");
  });

  it("retorna OK quando ainda está fora da janela de aviso", () => {
    expect(getLicenseStatus(new Date("2026-12-31T00:00:00Z"), 30, now)).toBe("OK");
  });

  it("respeita reminderDaysBefore diferentes", () => {
    const expiresAt = new Date("2026-09-20T00:00:00Z");
    expect(getLicenseStatus(expiresAt, 3, now)).toBe("OK");
    expect(getLicenseStatus(expiresAt, 10, now)).toBe("VENCE_EM_BREVE");
  });
});

describe("isWithinReminderWindow", () => {
  const now = new Date("2026-09-16T12:00:00Z");

  it("é falso quando o status é OK", () => {
    expect(isWithinReminderWindow(new Date("2026-12-31T00:00:00Z"), 30, now)).toBe(false);
  });

  it("é verdadeiro quando vence em breve ou já venceu", () => {
    expect(isWithinReminderWindow(new Date("2026-09-30T00:00:00Z"), 30, now)).toBe(true);
    expect(isWithinReminderWindow(new Date("2026-01-01T00:00:00Z"), 30, now)).toBe(true);
  });
});
