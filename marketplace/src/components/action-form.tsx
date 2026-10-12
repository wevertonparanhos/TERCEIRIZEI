"use client";

import { useActionState, type ReactNode } from "react";
import { FormMessage, SubmitButton, type FormState } from "./ui/form";
import type { ButtonVariant } from "./ui/button";
import { cn } from "@/lib/utils";

type Props = {
  action: (state: FormState, formData: FormData) => Promise<FormState>;
  submitLabel: string;
  pendingText?: string;
  variant?: ButtonVariant;
  confirm?: string;
  className?: string;
  footerClassName?: string;
  children?: ReactNode;
};

/** Formulário ligado a uma Server Action, com carregamento, erros e confirmação opcional. */
export function ActionForm({ action, submitLabel, pendingText, variant, confirm, className, footerClassName, children }: Props) {
  const [state, formAction] = useActionState(action, {} as FormState);
  const fieldErrors = Object.entries(state.errors ?? {}).filter(([, v]) => v?.length);

  return (
    <form
      action={formAction}
      className={cn("space-y-4", className)}
      onSubmit={(e) => {
        if (confirm && !window.confirm(confirm)) e.preventDefault();
      }}
    >
      <FormMessage state={state} />
      {fieldErrors.length > 0 ? (
        <ul className="list-disc space-y-0.5 pl-5 text-xs text-danger">
          {fieldErrors.map(([field, msgs]) => (
            <li key={field}>
              <span className="font-semibold">{field}</span>: {msgs?.[0]}
            </li>
          ))}
        </ul>
      ) : null}
      {children}
      <div className={footerClassName}>
        <SubmitButton variant={variant} pendingText={pendingText}>{submitLabel}</SubmitButton>
      </div>
    </form>
  );
}
