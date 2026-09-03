"use client";

import { useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

export function ProcessTabs({
  tabs,
}: {
  tabs: { key: string; label: string; content: ReactNode; badge?: boolean; icon?: ReactNode }[];
}) {
  const [active, setActive] = useState(tabs[0].key);
  const activeTab = tabs.find((t) => t.key === active) ?? tabs[0];

  return (
    <div>
      <div className="flex gap-1 border-b border-border">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActive(tab.key)}
            className={cn(
              "flex items-center gap-1.5 border-b-2 px-4 py-2 text-sm font-medium transition-colors",
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
