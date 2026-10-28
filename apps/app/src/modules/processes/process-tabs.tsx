"use client";

import { useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

export function ProcessTabs({
  tabs,
  initialKey,
}: {
  tabs: { key: string; label: string; content: ReactNode; badge?: boolean; icon?: ReactNode }[];
  initialKey?: string;
}) {
  const [active, setActive] = useState(tabs.some((t) => t.key === initialKey) ? (initialKey as string) : tabs[0].key);
  const activeTab = tabs.find((t) => t.key === active) ?? tabs[0];

  function select(key: string) {
    setActive(key);
    // Mantém a aba na URL (?tab=), assim "Copiar link" leva direto para ela.
    const url = new URL(window.location.href);
    url.searchParams.set("tab", key);
    window.history.replaceState(null, "", url.toString());
  }

  return (
    <div>
      <div className="flex gap-0.5 overflow-x-auto border-b border-border [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => select(tab.key)}
            className={cn(
              "flex flex-none items-center gap-1.5 border-b-2 px-3 py-2 text-sm font-medium transition-colors",
              tab.key === active
                ? "border-brand-navy text-ink dark:border-accent"
                : "border-transparent text-muted hover:text-ink"
            )}
          >
            {tab.icon}
            {tab.label}
            {tab.badge && <span className="h-1.5 w-1.5 flex-none rounded-full bg-accent" />}
          </button>
        ))}
      </div>
      <div className="py-6">{activeTab.content}</div>
    </div>
  );
}
