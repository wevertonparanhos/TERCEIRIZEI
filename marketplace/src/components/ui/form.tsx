"use client";

import { useFormStatus } from "react-dom";
import { LoaderCircle } from "lucide-react";
import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/utils";
import type { FormState } from "@/lib/form-state";
import { Button, type ButtonVariant } from "./button";

const fieldBase =
  "w-full rounded-xl border border-line-strong bg-surface px-3.5 text-[15px] text-ink placeholder:text-muted/70 " +
  "transition-colors focus:border-brand focus:outline-none focus:ring-4 focus:ring-brand/10 " +
  "disabled:bg-canvas disabled:text-muted aria-[invalid=true]:border-danger";

export function Input({ className, ...props }: ComponentProps<"input">) {
  return <input className={cn(fieldBase, "h-11", className)} {...props} />;
}

export function Textarea({ className, ...props }: ComponentProps<"textarea">) {
  return <textarea className={cn(fieldBase, "min-h-24 py-2.5", className)} {...props} />;
}

export function Select({ className, ...props }: ComponentProps<"select">) {
  return <select className={cn(fieldBase, "h-11 appearance-none pr-8", className)} {...props} />;
}

type FieldProps = {
  label: string;
  name: string;
  error?: string[] | string;
  hint?: ReactNode;
  children: ReactNode;
  className?: string;
};

/** Rótulo + controle + dica + erro, com ids ligados para leitores de tela. */
export function Field({ label, name, error, hint, children, className }: FieldProps) {
  const message = Array.isArray(error) ? error[0] : error;
  return (
    <div className={cn("space-y-1.5", className)}>
      <label htmlFor={name} className="block text-sm font-medium text-ink">
        {label}
      </label>
      {children}
      {hint && !message ? <p className="text-xs text-muted">{hint}</p> : null}
      {message ? (
        <p id={`${name}-error`} className="text-xs font-medium text-danger" role="alert">
          {message}
        </p>
      ) : null}
    </div>
  );
}

export function SubmitButton({
  children,
  pendingText = "Salvando…",
  variant = "primary",
  className,
  ...props
}: ComponentProps<"button"> & { pendingText?: string; variant?: ButtonVariant }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant={variant} disabled={pending || props.disabled} className={className} {...props}>
      {pending ? <LoaderCircle className="size-4 animate-spin" aria-hidden /> : null}
      {pending ? pendingText : children}
    </Button>
  );
}

export type { FormState } from "@/lib/form-state";

export function FormMessage({ state }: { state: FormState | undefined }) {
  if (!state?.message) return null;
  return (
    <div
      role={state.ok ? "status" : "alert"}
      className={cn(
        "rounded-xl px-4 py-3 text-sm font-medium",
        state.ok ? "bg-success-soft text-success" : "bg-danger-soft text-danger",
      )}
    >
      {state.message}
    </div>
  );
}
