"use client";

import { useEffect, useState } from "react";
import { Search, X } from "lucide-react";

/** Texto da busca que sobrevive à navegação: abrir uma tarefa e voltar (ou usar o "Voltar" do
 * navegador) devolve o quadro já filtrado. Fica guardado só nesta aba (sessionStorage). */
export function usePersistentSearch(storageKey: string): [string, (v: string) => void] {
  const [query, setQuery] = useState("");

  useEffect(() => {
    try {
      setQuery(window.sessionStorage.getItem(storageKey) ?? "");
    } catch {
      // armazenamento indisponível: a busca só não é lembrada
    }
  }, [storageKey]);

  function update(value: string) {
    setQuery(value);
    try {
      if (value) window.sessionStorage.setItem(storageKey, value);
      else window.sessionStorage.removeItem(storageKey);
    } catch {
      // ignora
    }
  }

  return [query, update];
}

export function SearchInput({
  value,
  onChange,
  placeholder = "Buscar tarefa...",
  className = "",
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  className?: string;
}) {
  return (
    <div className={`relative ${className}`}>
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-soft" />
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
        className="h-10 w-full rounded-xl border border-border-strong bg-surface pl-9 pr-9 text-sm text-ink placeholder:text-muted-soft focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30 [&::-webkit-search-cancel-button]:hidden"
      />
      {value && (
        <button
          type="button"
          aria-label="Limpar busca"
          onClick={() => onChange("")}
          className="absolute right-2.5 top-1/2 flex h-5 w-5 -translate-y-1/2 items-center justify-center rounded-full text-muted hover:bg-surface-alt hover:text-ink"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
}
