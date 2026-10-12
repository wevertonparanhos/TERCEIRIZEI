import { LogOut } from "lucide-react";
import { ROLE_LABEL, type Role } from "@/domain/permissions";
import { BrandMark } from "./brand-mark";
import { NavLinks, type NavItem } from "./nav-links";

type Props = {
  user: { name: string; role: Role };
  nav: NavItem[];
  children: React.ReactNode;
};

/** Moldura das áreas logadas: barra lateral no desktop, abas roláveis no celular. */
export function AppShell({ user, nav, children }: Props) {
  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[16rem_1fr]">
      <aside className="hidden border-r border-line bg-surface lg:flex lg:flex-col">
        <div className="flex h-16 items-center px-5">
          <BrandMark />
        </div>
        <div className="flex-1 px-3 py-4">
          <NavLinks items={nav} orientation="vertical" />
        </div>
        <UserBox user={user} />
      </aside>

      <div className="min-w-0">
        <header className="sticky top-0 z-20 border-b border-line bg-surface/90 backdrop-blur lg:hidden">
          <div className="flex h-14 items-center justify-between px-4">
            <BrandMark />
            <form action="/sair" method="post">
              <button type="submit" className="inline-flex items-center gap-1.5 text-sm font-medium text-ink-soft hover:text-ink">
                <LogOut className="size-4" aria-hidden /> Sair
              </button>
            </form>
          </div>
          <div className="overflow-x-auto px-4 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <NavLinks items={nav} orientation="horizontal" />
          </div>
        </header>
        <main className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 lg:px-10">{children}</main>
      </div>
    </div>
  );
}

function UserBox({ user }: { user: { name: string; role: Role } }) {
  return (
    <div className="border-t border-line p-4">
      <p className="truncate text-sm font-semibold">{user.name}</p>
      <p className="text-xs text-muted">{ROLE_LABEL[user.role]}</p>
      <form action="/sair" method="post" className="mt-3">
        <button type="submit" className="inline-flex items-center gap-1.5 text-sm font-medium text-ink-soft hover:text-danger">
          <LogOut className="size-4" aria-hidden /> Sair
        </button>
      </form>
    </div>
  );
}
