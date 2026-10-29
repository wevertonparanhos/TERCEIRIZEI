export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-brand-navy via-brand-blue to-brand-navy px-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex flex-col items-center">
          <div className="flex h-16 items-center justify-center rounded-2xl bg-white px-6 shadow-lg">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo-terceirizei.png" alt="Terceirizei — Consultoria e Gestão Empresarial" className="h-11 w-auto" />
          </div>
          <p className="mt-3 text-xs font-semibold uppercase tracking-[2px] text-[#8A9AEA]">Sistema de gestão</p>
        </div>
        <div className="rounded-2xl border border-border bg-surface p-8 shadow-xl">{children}</div>
      </div>
    </div>
  );
}
