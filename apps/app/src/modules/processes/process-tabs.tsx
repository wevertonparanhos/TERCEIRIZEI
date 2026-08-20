"use client";

import { useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

export function ProcessTabs({ tabs }: { tabs: { key: string; label: string; content: ReactNode }[] }) {
  const [active, setActive] = useState(tabs[0].key);
  const activeTab = tabs.find((t) => t.key === active) ?? tabs[0];

  return (
    <div>
      <div className="flex gap-1 border-b border-slate-200">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActive(tab.key)}
            className={cn(
              "border-b-2 px-4 py-2 text-sm font-medium transition-colors",
              tab.key === active
                ? "border-brand-navy text-brand-navy"
                : "border-transparent text-slate-500 hover:text-brand-navy"
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <div className="py-6">{activeTab.content}</div>
    </div>
  );
}
