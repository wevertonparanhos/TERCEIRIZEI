/** Esqueleto mostrado NA HORA do clique, enquanto a página nova carrega no servidor.
 * Sem isso a tela antiga ficava parada até a resposta chegar; com ele a navegação
 * responde imediatamente (e o Next já deixa essa casca pré-carregada nos links do menu). */
export default function InternoLoading() {
  return (
    <div className="animate-pulse space-y-6 p-8" aria-busy="true" aria-label="Carregando">
      <div className="space-y-2">
        <div className="h-7 w-56 rounded-lg bg-surface-alt" />
        <div className="h-4 w-72 rounded bg-surface-alt" />
      </div>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-20 rounded-2xl border border-border/70 bg-surface" />
        ))}
      </div>
      <div className="grid gap-3 md:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="space-y-3 rounded-2xl border border-border/70 bg-surface p-4">
            <div className="h-4 w-24 rounded bg-surface-alt" />
            <div className="h-16 rounded-lg bg-surface-alt" />
            <div className="h-16 rounded-lg bg-surface-alt" />
          </div>
        ))}
      </div>
    </div>
  );
}
