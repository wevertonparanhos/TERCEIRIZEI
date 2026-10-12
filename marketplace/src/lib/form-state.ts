/** Estado devolvido pelas Server Actions aos formulários (compartilhado servidor/cliente). */
export type FormState = {
  ok?: boolean;
  message?: string;
  errors?: Record<string, string[] | undefined>;
  /** Valores enviados (sem senhas) para repreencher o formulário após erro. */
  values?: Record<string, string>;
};

/** Copia os campos do formulário, descartando senhas e arquivos. */
export function echoValues(formData: FormData, omit: string[] = ["password", "confirm"]): Record<string, string> {
  const out: Record<string, string> = {};
  formData.forEach((v, k) => {
    if (typeof v === "string" && !omit.includes(k) && !k.startsWith("$")) out[k] = v;
  });
  return out;
}
