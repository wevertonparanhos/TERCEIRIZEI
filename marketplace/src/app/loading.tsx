import { LoaderCircle } from "lucide-react";

export default function Loading() {
  return (
    <div className="grid min-h-[50dvh] place-items-center" role="status" aria-live="polite">
      <LoaderCircle className="size-6 animate-spin text-brand" aria-hidden />
      <span className="sr-only">Carregando…</span>
    </div>
  );
}
