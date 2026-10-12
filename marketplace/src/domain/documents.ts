/** Validação de CPF/CNPJ (dígitos verificadores) e de chave PIX. Funções puras. */

const onlyDigits = (v: string) => v.replace(/\D/g, "");

export function isValidCpf(value: string): boolean {
  const d = onlyDigits(value);
  if (d.length !== 11 || /^(\d)\1{10}$/.test(d)) return false;
  const calc = (len: number) => {
    let sum = 0;
    for (let i = 0; i < len; i++) sum += Number(d[i]) * (len + 1 - i);
    const r = (sum * 10) % 11;
    return r === 10 ? 0 : r;
  };
  return calc(9) === Number(d[9]) && calc(10) === Number(d[10]);
}

export function isValidCnpj(value: string): boolean {
  const d = onlyDigits(value);
  if (d.length !== 14 || /^(\d)\1{13}$/.test(d)) return false;
  const calc = (len: number) => {
    const weights = len === 12 ? [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2] : [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
    const sum = weights.reduce((acc, w, i) => acc + Number(d[i]) * w, 0);
    const r = sum % 11;
    return r < 2 ? 0 : 11 - r;
  };
  return calc(12) === Number(d[12]) && calc(13) === Number(d[13]);
}

/** Normaliza CPF ou CNPJ válido (só dígitos) ou devolve null. */
export function normalizeCpfCnpj(value: string): string | null {
  const d = onlyDigits(value);
  if (d.length === 11) return isValidCpf(d) ? d : null;
  if (d.length === 14) return isValidCnpj(d) ? d : null;
  return null;
}

/** "12345678909" → "***.456.789-**" (exibição mascarada, LGPD). */
export function maskCpfCnpj(value: string): string {
  const d = onlyDigits(value);
  if (d.length === 11) return `***.${d.slice(3, 6)}.${d.slice(6, 9)}-**`;
  if (d.length === 14) return `**.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8, 12)}-**`;
  return "***";
}

export const PIX_KEY_TYPES = ["CPF", "CNPJ", "EMAIL", "PHONE", "EVP"] as const;
export type PixKeyType = (typeof PIX_KEY_TYPES)[number];

/** Normaliza a chave PIX conforme o tipo; null se inválida. */
export function normalizePixKey(type: PixKeyType, raw: string): string | null {
  const v = raw.trim();
  switch (type) {
    case "CPF":
      return isValidCpf(v) ? onlyDigits(v) : null;
    case "CNPJ":
      return isValidCnpj(v) ? onlyDigits(v) : null;
    case "EMAIL":
      return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v) && v.length <= 77 ? v.toLowerCase() : null;
    case "PHONE": {
      const d = onlyDigits(v).replace(/^55/, "");
      return /^\d{10,11}$/.test(d) ? `+55${d}` : null;
    }
    case "EVP":
      return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v) ? v.toLowerCase() : null;
  }
}
