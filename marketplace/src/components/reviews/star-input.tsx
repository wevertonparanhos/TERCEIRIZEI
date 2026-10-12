"use client";

import { useState } from "react";
import { Star } from "lucide-react";
import { RATING_LABEL } from "@/domain/review-options";
import { cn } from "@/lib/utils";

/**
 * Seletor de estrelas acessível: é um grupo de rádios (teclado com setas
 * funciona nativamente), com destaque ao passar o mouse.
 */
export function StarInput({
  name,
  label,
  value,
  onChange,
  size = "lg",
  showLabel = true,
}: {
  name: string;
  label: string;
  value: number;
  onChange: (value: number) => void;
  size?: "md" | "lg";
  showLabel?: boolean;
}) {
  const [hover, setHover] = useState(0);
  const shown = hover || value;
  const px = size === "lg" ? "size-10" : "size-7";

  return (
    <fieldset>
      <legend className="sr-only">{label}</legend>
      <div className="flex items-center gap-3">
        <div className="flex" onMouseLeave={() => setHover(0)}>
          {[1, 2, 3, 4, 5].map((n) => (
            <label key={n} className="cursor-pointer p-0.5" onMouseEnter={() => setHover(n)}>
              <input
                type="radio"
                name={name}
                value={n}
                checked={value === n}
                onChange={() => onChange(n)}
                className="peer sr-only"
                aria-label={`${n} ${n === 1 ? "estrela" : "estrelas"} — ${RATING_LABEL[n]}`}
              />
              <Star
                className={cn(
                  px,
                  "rounded transition-transform peer-focus-visible:outline-2 peer-focus-visible:outline-brand hover:scale-110",
                  n <= shown ? "text-highlight" : "text-line-strong",
                )}
                fill="currentColor"
                strokeWidth={0}
                aria-hidden
              />
            </label>
          ))}
        </div>
        {showLabel ? <span className="min-w-20 text-sm font-semibold text-ink-soft">{shown ? RATING_LABEL[shown] : ""}</span> : null}
      </div>
    </fieldset>
  );
}
