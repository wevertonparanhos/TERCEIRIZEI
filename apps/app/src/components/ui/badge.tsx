import * as React from "react";
import { cn } from "@/lib/utils";

const VARIANT_CLASSES: Record<string, string> = {
  neutral: "bg-slate-100 text-slate-600",
  success: "bg-emerald-50 text-emerald-700",
  warning: "bg-amber-50 text-amber-700",
  info: "bg-blue-50 text-brand-blue",
};

export function Badge({
  variant = "neutral",
  className,
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & { variant?: keyof typeof VARIANT_CLASSES }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
        VARIANT_CLASSES[variant],
        className
      )}
      {...props}
    />
  );
}
