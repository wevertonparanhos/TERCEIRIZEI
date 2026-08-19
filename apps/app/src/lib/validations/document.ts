function onlyDigits(value: string): string {
  return value.replace(/\D/g, "");
}

function isAllSameDigit(value: string): boolean {
  return /^(\d)\1*$/.test(value);
}

function calcCheckDigit(digits: string, weights: number[]): number {
  const sum = digits
    .split("")
    .reduce((acc, digit, index) => acc + Number(digit) * weights[index], 0);
  const remainder = sum % 11;
  return remainder < 2 ? 0 : 11 - remainder;
}

function isValidCpf(cpf: string): boolean {
  if (cpf.length !== 11 || isAllSameDigit(cpf)) return false;

  const d1 = calcCheckDigit(cpf.slice(0, 9), [10, 9, 8, 7, 6, 5, 4, 3, 2]);
  const d2 = calcCheckDigit(cpf.slice(0, 9) + d1, [11, 10, 9, 8, 7, 6, 5, 4, 3, 2]);

  return cpf.slice(9) === `${d1}${d2}`;
}

function isValidCnpj(cnpj: string): boolean {
  if (cnpj.length !== 14 || isAllSameDigit(cnpj)) return false;

  const d1 = calcCheckDigit(cnpj.slice(0, 12), [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]);
  const d2 = calcCheckDigit(cnpj.slice(0, 12) + d1, [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]);

  return cnpj.slice(12) === `${d1}${d2}`;
}

/** Aceita CPF (11 dígitos) ou CNPJ (14 dígitos), com ou sem máscara. */
export function isValidCpfCnpj(value: string): boolean {
  const digits = onlyDigits(value);
  if (digits.length === 11) return isValidCpf(digits);
  if (digits.length === 14) return isValidCnpj(digits);
  return false;
}
