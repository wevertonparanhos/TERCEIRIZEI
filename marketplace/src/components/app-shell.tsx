import Link from "next/link";
import { Bell, LogOut } from "lucide-react";
import { ROLE_LABEL, type Role } from "@/domain/permissions";
import { BrandMark } from "./brand-mark";
import { NavLinks, type NavItem } from "./nav-links";
import { getSessionUser } from "@/server/auth";
import { unreadCount } from "@/server/notifications";

type Props = {
  user: { name: string; role: Role };
  nav: NavItem[];
  children: React.ReactNode;
};

/** Moldura das áreas logadas: barra lateral no desktop, abas roláveis no celular. */
export async function AppShell({ user, nav, children }: Props) {
  const session = await getSessionUser();
  const unread = session ? await unreadCount(session.id) : 0;
  const bell = (
    <Link href="/notificacoes" className="relative inline-flex items-center rounded-full p-2 text-ink-soft hover:bg-ink/5 hover:text-ink" aria-label={unread ? `${unread} notificações não lidas` : "Notificações"}>
      <Bell className="size-5" aria-hidden />
      {unread ? <span className="absolute -right-0.5 -top-0.5 grid min-w-5 place-items-center rounded-full bg-danger px-1 text-[11px] font-bold text-white">{unread > 9 ? "9+" : unread}</span> : null}
    </Link>
  );
  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[16rem_1fr]">
      <aside className="hidden border-r border-line bg-surface lg:flex lg:flex-col">
        <div className="flex h-16 items-center justify-between px-5">
          <BrandMark />
          {bell}
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
            <div className="flex items-center gap-2">
            {bell}
            <form action="/sair" method="post">
              <button type="submit" className="inline-flex items-center gap-1.5 text-sm font-medium text-ink-soft hover:text-ink">
                <LogOut className="size-4" aria-hidden /> Sair
              </button>
            </form>
            </div>
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
