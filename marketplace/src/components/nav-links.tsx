"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BadgeCheck,
  Briefcase,
  House,
  LayoutDashboard,
  Percent,
  ScrollText,
  Star,
  Tags,
  User,
  UserCog,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

const ICONS = {
  dashboard: LayoutDashboard,
  home: House,
  user: User,
  briefcase: Briefcase,
  tags: Tags,
  percent: Percent,
  verified: BadgeCheck,
  users: UserCog,
  audit: ScrollText,
  wallet: Wallet,
  star: Star,
} satisfies Record<string, LucideIcon>;

export type NavItem = { href: string; label: string; icon: keyof typeof ICONS; exact?: boolean };

export function NavLinks({ items, orientation }: { items: NavItem[]; orientation: "vertical" | "horizontal" }) {
  const pathname = usePathname();

  return (
    <nav aria-label="Área">
      <ul className={cn(orientation === "vertical" ? "space-y-1" : "flex gap-1")}>
        {items.map((item) => {
          const active = item.exact ? pathname === item.href : pathname === item.href || pathname.startsWith(`${item.href}/`);
          const Icon = ICONS[item.icon];
          return (
            <li key={item.href} className="shrink-0">
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm font-medium transition-colors",
                  active ? "bg-brand-soft text-brand-strong" : "text-ink-soft hover:bg-ink/5 hover:text-ink",
                )}
              >
                <Icon className="size-4" aria-hidden />
                <span className="whitespace-nowrap">{item.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
