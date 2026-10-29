"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

export type NavItem = { href: string; label: string; icon: ReactNode };
export type NavGroup = { label: string; items: NavItem[] };

function isActive(pathname: string, href: string): boolean {
  if (href === "/dashboard") return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function SidebarNav({ groups }: { groups: NavGroup[] }) {
  const pathname = usePathname();

  return (
    <nav className="flex-1 space-y-4 overflow-y-auto px-3 py-3">
      {groups.map((group) => (
        <div key={group.label}>
          <p className="px-3 pb-1.5 text-[10px] font-semibold uppercase tracking-[0.8px] text-muted-soft">{group.label}</p>
          <div className="space-y-0.5">
            {group.items.map((item) => {
              const active = isActive(pathname, item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`group flex h-9 items-center gap-3 rounded-xl px-3 text-sm font-medium transition-all duration-200 active:scale-[0.98] ${
                    active
                      ? "bg-brand-blue text-white shadow-sm"
                      : "text-muted hover:bg-surface-alt hover:text-ink"
                  }`}
                >
                  <span className={`flex-none ${active ? "text-white" : "text-muted-soft group-hover:text-ink"}`}>{item.icon}</span>
                  {item.label}
                </Link>
              );
            })}
          </div>
        </div>
      ))}
    </nav>
  );
}
