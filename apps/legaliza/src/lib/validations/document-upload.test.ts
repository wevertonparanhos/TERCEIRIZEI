import { describe, it, expect } from "vitest";
import { validateUploadedFile, sanitizeFileName, MAX_UPLOAD_SIZE_BYTES } from "./document-upload";

function makeFile(name: string, type: string, sizeBytes: number): File {
  const content = sizeBytes > 0 ? new Uint8Array(sizeBytes) : new Uint8Array(0);
  return new File([content], name, { type });
}

describe("validateUploadedFile", () => {
  it("aceita um PDF dentro do limite", () => {
    expect(() => validateUploadedFile(makeFile("contrato.pdf", "application/pdf", 1024))).not.toThrow();
  });

  it("rejeita arquivo vazio", () => {
    expect(() => validateUploadedFile(makeFile("vazio.pdf", "application/pdf", 0))).toThrow("Selecione um arquivo.");
  });

  it("rejeita arquivo maior que 20MB", () => {
    expect(() => validateUploadedFile(makeFile("grande.pdf", "application/pdf", MAX_UPLOAD_SIZE_BYTES + 1))).toThrow(
      "Arquivo maior que 20MB."
    );
  });

  it("rejeita tipo MIME não permitido", () => {
    expect(() => validateUploadedFile(makeFile("script.exe", "application/x-msdownload", 1024))).toThrow(
      "Tipo de arquivo não permitido"
    );
  });

  it("aceita imagem PNG", () => {
    expect(() => validateUploadedFile(makeFile("foto.png", "image/png", 1024))).not.toThrow();
  });
});

describe("sanitizeFileName", () => {
  it("mantém nome já seguro sem alteração", () => {
    expect(sanitizeFileName("contrato-social.pdf")).toBe("contrato-social.pdf");
  });

  it("substitui espaços e acentos por underscore, sem sobrar caractere fora de [\\w.-]", () => {
    const result = sanitizeFileName("contrato social ação.pdf");
    expect(result).toMatch(/^[\w.-]+$/);
    expect(result).not.toContain(" ");
    expect(result.endsWith(".pdf")).toBe(true);
    expect(result.startsWith("contrato_social_")).toBe(true);
  });

  it("substitui caracteres especiais por underscore", () => {
    expect(sanitizeFileName("arquivo (1)#2.pdf")).toBe("arquivo__1__2.pdf");
  });
});
