export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-brand-navy via-brand-teal to-brand-navy px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <span className="font-sans text-2xl font-extrabold tracking-tight text-white">LEGALIZA.AI</span>
        </div>
        <div className="rounded-xl border border-border bg-surface p-8 shadow-xl">{children}</div>
      </div>
    </div>
  );
}
