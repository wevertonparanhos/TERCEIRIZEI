"use client";

import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Check, LoaderCircle, Minus, Plus, Star } from "lucide-react";
import { AddressForm } from "@/components/address-form";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/form";
import { Card, Notice } from "@/components/ui/surface";
import { formatBps, formatBRL } from "@/domain/money";
import { MIN_REVIEWS_FOR_AVERAGE } from "@/domain/review-options";
import { cn, formatMinutes } from "@/lib/utils";
import { createBookingAction, previewQuoteAction, slotsAction } from "../actions";

export type WizardProvider = {
  id: string;
  name: string;
  city: string;
  ratingSum: number;
  ratingCount: number;
  packages: Record<string, number>;
  addons: Record<string, number>;
  rules: Record<string, { unit: number; base: number; min: number }>;
  areas: { city: string; state: string; neighborhoods: string[] }[];
};

type Service = {
  id: string;
  slug: string;
  model: "FIXED" | "CALCULATED";
  packages: { id: string; name: string; description: string; durationMinutes: number; bedrooms: number | null; bathrooms: number | null; maxAreaM2: number | null }[];
  addons: { id: string; name: string; description: string | null; pricing: "FIXED" | "PER_UNIT"; unitLabel: string | null; maxQuantity: number }[];
  rules: { id: string; name: string; unitLabel: string; minQuantity: number; maxQuantity: number }[];
  cancellation: string | null;
};

type Address = { id: string; label: string; line: string; neighborhood: string; city: string; state: string };
type Preview = Extract<Awaited<ReturnType<typeof previewQuoteAction>>, { ok: true }>;

const weekday = new Intl.DateTimeFormat("pt-BR", { weekday: "short", timeZone: "UTC" });
const dayMonth = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short", timeZone: "UTC" });

function Step({ n, title, done, children }: { n: number; title: string; done?: boolean; children: React.ReactNode }) {
  return (
    <Card className="p-5 sm:p-6">
      <h2 className="mb-4 flex items-center gap-3 font-semibold">
        <span className={cn("grid size-7 place-items-center rounded-full text-sm", done ? "bg-brand text-white" : "bg-ink/5 text-ink-soft")}>
          {done ? <Check className="size-4" aria-hidden /> : n}
        </span>
        {title}
      </h2>
      {children}
    </Card>
  );
}

const serves = (p: WizardProvider, a: Address) =>
  p.areas.some(
    (area) =>
      area.state === a.state &&
      area.city.toLowerCase() === a.city.toLowerCase() &&
      (area.neighborhoods.length === 0 || area.neighborhoods.some((n) => n.toLowerCase() === a.neighborhood.toLowerCase())),
  );

export function CheckoutWizard({
  service,
  providers,
  initialProviderId,
  addresses,
  dates,
}: {
  service: Service;
  providers: WizardProvider[];
  initialProviderId: string | null;
  addresses: Address[];
  dates: string[];
}) {
  const router = useRouter();
  const [providerId, setProviderId] = useState<string | null>(initialProviderId);
  const provider = providers.find((p) => p.id === providerId) ?? null;

  const [packageId, setPackageId] = useState<string | null>(null);
  const [ruleId] = useState<string | null>(service.rules[0]?.id ?? null);
  const rule = service.rules.find((r) => r.id === ruleId) ?? null;
  const [quantity, setQuantity] = useState<number>(rule?.minQuantity ?? 1);
  const [addons, setAddons] = useState<Record<string, number>>({});
  const [addressId, setAddressId] = useState<string | null>(addresses[0]?.id ?? null);
  const [addingAddress, setAddingAddress] = useState(addresses.length === 0);
  const [date, setDate] = useState<string | null>(null);
  const [slots, setSlots] = useState<{ start: string; label: string }[] | null>(null);
  const [slotStart, setSlotStart] = useState<string | null>(null);
  const [details, setDetails] = useState({ bedrooms: "", bathrooms: "", areaM2: "", hasPets: false, notes: "" });
  const [accept, setAccept] = useState(false);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loadingSlots, startSlots] = useTransition();
  const [submitting, startSubmit] = useTransition();

  const address = addresses.find((a) => a.id === addressId) ?? null;

  // Ao trocar de profissional, mantém só o que ele oferece.
  useEffect(() => {
    if (!provider) return;
    if (packageId && provider.packages[packageId] === undefined) setPackageId(null);
    setAddons((cur) => Object.fromEntries(Object.entries(cur).filter(([id]) => provider.addons[id] !== undefined)));
  }, [provider, packageId]);

  const checkout = useMemo(() => {
    if (!provider) return null;
    if (service.model === "FIXED" && !packageId) return null;
    if (service.model === "CALCULATED" && (!rule || provider.rules[rule.id] === undefined)) return null;
    return {
      serviceId: service.id,
      providerId: provider.id,
      ...(service.model === "FIXED" ? { packageId } : { ruleId: rule!.id, quantity }),
      addons,
    };
  }, [provider, packageId, rule, quantity, addons, service.id, service.model]);

  const checkoutKey = JSON.stringify(checkout);

  // Prévia oficial do preço (servidor) sempre que a escolha muda.
  useEffect(() => {
    setPreview(null);
    if (!checkout) return;
    let alive = true;
    const t = setTimeout(async () => {
      const res = await previewQuoteAction(checkout);
      if (!alive) return;
      if (res.ok) {
        setPreview(res);
        setError(null);
      } else setError(res.error);
    }, 250);
    return () => {
      alive = false;
      clearTimeout(t);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [checkoutKey]);

  // A duração muda os horários livres: recarrega ao trocar escolha ou dia.
  const loadSlots = useCallback(
    (d: string) => {
      if (!checkout) return;
      setDate(d);
      setSlotStart(null);
      startSlots(async () => {
        const res = await slotsAction(checkout, d);
        setSlots(res.ok ? res.slots : []);
        if (!res.ok) setError(res.error);
      });
    },
    [checkout],
  );
  useEffect(() => {
    if (date) loadSlots(date);
    else setSlots(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [checkoutKey]);

  const addressOk = !!(provider && address && serves(provider, address));
  const ready = !!(checkout && preview && addressOk && date && slotStart && accept);

  function submit() {
    if (!ready || !checkout) return;
    setError(null);
    startSubmit(async () => {
      const res = await createBookingAction({
        ...checkout,
        addressId,
        date,
        start: slotStart,
        bedrooms: details.bedrooms || undefined,
        bathrooms: details.bathrooms || undefined,
        areaM2: details.areaM2 || undefined,
        hasPets: details.hasPets,
        notes: details.notes,
        acceptTerms: accept,
      });
      if (res.ok) router.push(`/conta/pedidos/${res.bookingId}?novo=1`);
      else {
        setError(res.error);
        if (date) loadSlots(date);
      }
    });
  }

  if (providers.length === 0) {
    return (
      <div className="mt-8">
        <Notice title="Nenhum profissional disponível">Ainda não há profissionais com preço publicado para este serviço. Volte em breve.</Notice>
      </div>
    );
  }

  return (
    <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_20rem]">
      <div className="min-w-0 space-y-4">
        <Step n={1} title="Profissional" done={!!provider}>
          <ul className="grid gap-3 sm:grid-cols-2">
            {providers.map((p) => {
              const established = p.ratingCount >= MIN_REVIEWS_FOR_AVERAGE;
              const prices = Object.values(service.model === "FIXED" ? p.packages : Object.fromEntries(Object.entries(p.rules).map(([k, v]) => [k, v.unit])));
              return (
                <li key={p.id}>
                  <button
                    type="button"
                    onClick={() => setProviderId(p.id)}
                    aria-pressed={p.id === providerId}
                    className={cn(
                      "flex w-full items-center gap-3 rounded-2xl border p-4 text-left transition",
                      p.id === providerId ? "border-brand bg-brand-soft ring-2 ring-brand/20" : "border-line hover:border-brand/40",
                    )}
                  >
                    <span className="grid size-11 shrink-0 place-items-center rounded-full bg-brand font-bold text-white">{p.name.charAt(0)}</span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-semibold">{p.name}</span>
                      <span className="flex items-center gap-1 text-sm">
                        <Star className="size-3.5 text-highlight" fill="currentColor" strokeWidth={0} aria-hidden />
                        {established ? `${(p.ratingSum / p.ratingCount).toFixed(1).replace(".", ",")} (${p.ratingCount})` : "Novo"}
                        <span className="text-muted"> · {p.city}</span>
                      </span>
                    </span>
                    {prices.length ? <span className="shrink-0 text-right text-xs text-muted">a partir de<span className="block text-sm font-bold text-ink">{formatBRL(Math.min(...prices))}</span></span> : null}
                  </button>
                </li>
              );
            })}
          </ul>
          {provider ? <Link href={`/profissionais/${provider.id}`} target="_blank" className="mt-3 inline-block text-sm font-medium text-brand hover:underline">Ver avaliações de {provider.name.split(" ")[0]}</Link> : null}
        </Step>

        {provider ? (
          <Step n={2} title={service.model === "FIXED" ? "Pacote e adicionais" : "Quantidade e adicionais"} done={!!checkout}>
            {service.model === "FIXED" ? (
              <ul className="space-y-2">
                {service.packages.map((pk) => {
                  const price = provider.packages[pk.id];
                  if (price === undefined) return null;
                  return (
                    <li key={pk.id}>
                      <label className={cn("flex cursor-pointer items-start gap-3 rounded-2xl border p-4 transition", packageId === pk.id ? "border-brand bg-brand-soft" : "border-line hover:border-brand/40")}>
                        <input type="radio" name="package" className="mt-1 accent-[var(--color-brand)]" checked={packageId === pk.id} onChange={() => setPackageId(pk.id)} />
                        <span className="flex-1">
                          <span className="block font-semibold">{pk.name}</span>
                          <span className="block text-sm text-muted">{pk.description}</span>
                          <span className="mt-1 block text-xs text-muted">{formatMinutes(pk.durationMinutes)} estimadas{pk.maxAreaM2 ? ` · até ${pk.maxAreaM2} m²` : ""}</span>
                        </span>
                        <span className="font-bold">{formatBRL(price)}</span>
                      </label>
                    </li>
                  );
                })}
              </ul>
            ) : rule && provider.rules[rule.id] ? (
              <div className="space-y-2">
                <label htmlFor="quantity" className="text-sm font-medium">{rule.name} ({rule.unitLabel})</label>
                <div className="flex items-center gap-3">
                  <Input
                    id="quantity"
                    type="number"
                    min={rule.minQuantity}
                    max={rule.maxQuantity}
                    value={quantity}
                    onChange={(e) => setQuantity(Math.max(rule.minQuantity, Math.min(rule.maxQuantity, Number(e.target.value) || rule.minQuantity)))}
                    className="w-32"
                  />
                  <span className="text-sm text-muted">
                    {formatBRL(provider.rules[rule.id]!.unit)} por {rule.unitLabel}
                    {provider.rules[rule.id]!.min ? ` · mínimo ${formatBRL(provider.rules[rule.id]!.min)}` : ""}
                  </span>
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted">Este profissional não oferece este serviço.</p>
            )}

            {service.addons.some((a) => provider.addons[a.id] !== undefined) ? (
              <div className="mt-6">
                <p className="mb-2 text-sm font-semibold">Adicionais</p>
                <ul className="divide-y divide-line rounded-2xl border border-line">
                  {service.addons.map((a) => {
                    const price = provider.addons[a.id];
                    if (price === undefined) return null;
                    const qty = addons[a.id] ?? 0;
                    const max = a.pricing === "FIXED" ? 1 : a.maxQuantity;
                    const setQty = (n: number) => setAddons((cur) => ({ ...cur, [a.id]: Math.max(0, Math.min(max, n)) }));
                    return (
                      <li key={a.id} className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
                        <span>
                          <span className="font-medium">{a.name}</span>
                          <span className="block text-muted">{formatBRL(price)}{a.pricing === "PER_UNIT" && a.unitLabel ? ` / ${a.unitLabel}` : ""}</span>
                        </span>
                        {max === 1 ? (
                          <input type="checkbox" checked={qty === 1} onChange={(e) => setQty(e.target.checked ? 1 : 0)} className="size-5 accent-[var(--color-brand)]" aria-label={`Adicionar ${a.name}`} />
                        ) : (
                          <span className="flex items-center gap-2">
                            <button type="button" onClick={() => setQty(qty - 1)} className="grid size-8 place-items-center rounded-full border border-line-strong" aria-label={`Menos ${a.name}`}><Minus className="size-3.5" /></button>
                            <span className="w-5 text-center font-semibold" aria-live="polite">{qty}</span>
                            <button type="button" onClick={() => setQty(qty + 1)} className="grid size-8 place-items-center rounded-full border border-line-strong" aria-label={`Mais ${a.name}`}><Plus className="size-3.5" /></button>
                          </span>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </div>
            ) : null}
          </Step>
        ) : null}

        {checkout ? (
          <Step n={3} title="Endereço" done={addressOk}>
            {addresses.length > 0 && !addingAddress ? (
              <ul className="space-y-2">
                {addresses.map((a) => {
                  const ok = provider ? serves(provider, a) : false;
                  return (
                    <li key={a.id}>
                      <label className={cn("flex items-start gap-3 rounded-2xl border p-4", !ok && "opacity-60", addressId === a.id ? "border-brand bg-brand-soft" : "border-line", ok && "cursor-pointer")}>
                        <input type="radio" name="address" className="mt-1 accent-[var(--color-brand)]" checked={addressId === a.id} onChange={() => setAddressId(a.id)} disabled={!ok} />
                        <span className="text-sm">
                          <span className="block font-semibold">{a.label}</span>
                          <span className="text-muted">{a.line} · {a.city}/{a.state}</span>
                          {!ok ? <span className="block text-xs font-medium text-warning">{provider?.name.split(" ")[0]} não atende este local.</span> : null}
                        </span>
                      </label>
                    </li>
                  );
                })}
              </ul>
            ) : null}
            {addingAddress ? (
              <AddressForm
                onSaved={() => {
                  setAddingAddress(false);
                  router.refresh();
                }}
              />
            ) : (
              <Button variant="link" className="mt-3" onClick={() => setAddingAddress(true)}>+ Novo endereço</Button>
            )}
          </Step>
        ) : null}

        {checkout && addressOk ? (
          <Step n={4} title="Dia e horário" done={!!slotStart}>
            <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-2 [scrollbar-width:thin]">
              {dates.map((d) => {
                const dt = new Date(`${d}T12:00:00Z`);
                return (
                  <button
                    key={d}
                    type="button"
                    onClick={() => loadSlots(d)}
                    aria-pressed={date === d}
                    className={cn("flex w-16 shrink-0 flex-col items-center rounded-2xl border py-2 text-sm transition", date === d ? "border-ink bg-ink text-white" : "border-line hover:border-ink/40")}
                  >
                    <span className="text-xs capitalize opacity-80">{weekday.format(dt).replace(".", "")}</span>
                    <span className="font-semibold">{dayMonth.format(dt).replace(" de ", " ").replace(".", "")}</span>
                  </button>
                );
              })}
            </div>
            <div className="mt-4 min-h-12">
              {loadingSlots ? (
                <p className="flex items-center gap-2 text-sm text-muted"><LoaderCircle className="size-4 animate-spin" aria-hidden /> Buscando horários…</p>
              ) : slots === null ? (
                <p className="text-sm text-muted">Escolha um dia para ver os horários livres.</p>
              ) : slots.length === 0 ? (
                <p className="text-sm text-muted">Sem horários livres neste dia. Tente outra data.</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {slots.map((s) => (
                    <button
                      key={s.start}
                      type="button"
                      onClick={() => setSlotStart(s.start)}
                      aria-pressed={slotStart === s.start}
                      className={cn("rounded-full border px-4 py-2 text-sm font-medium transition", slotStart === s.start ? "border-brand bg-brand text-white" : "border-line-strong hover:border-brand/50")}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </Step>
        ) : null}

        {slotStart ? (
          <Step n={5} title="Sobre o imóvel">
            <div className="grid gap-3 sm:grid-cols-3">
              <label className="text-sm">Quartos<Input type="number" min={0} max={30} value={details.bedrooms} onChange={(e) => setDetails((d) => ({ ...d, bedrooms: e.target.value }))} className="mt-1" /></label>
              <label className="text-sm">Banheiros<Input type="number" min={0} max={30} value={details.bathrooms} onChange={(e) => setDetails((d) => ({ ...d, bathrooms: e.target.value }))} className="mt-1" /></label>
              <label className="text-sm">Área (m²)<Input type="number" min={0} value={details.areaM2} onChange={(e) => setDetails((d) => ({ ...d, areaM2: e.target.value }))} className="mt-1" /></label>
            </div>
            <label className="mt-3 flex items-center gap-2 text-sm">
              <input type="checkbox" checked={details.hasPets} onChange={(e) => setDetails((d) => ({ ...d, hasPets: e.target.checked }))} className="size-4 accent-[var(--color-brand)]" />
              Há animais no imóvel
            </label>
            <label className="mt-3 block text-sm">
              Observações para o profissional
              <Textarea rows={3} maxLength={1000} value={details.notes} onChange={(e) => setDetails((d) => ({ ...d, notes: e.target.value }))} className="mt-1" placeholder="Algo importante sobre o serviço ou o acesso ao imóvel" />
            </label>
          </Step>
        ) : null}
      </div>

      <aside className="lg:sticky lg:top-24 lg:self-start">
        <Card className="p-5">
          <h2 className="font-semibold">Resumo</h2>
          {!preview ? (
            <p className="mt-3 text-sm text-muted">{checkout ? "Calculando…" : "Escolha o profissional e o serviço para ver o valor."}</p>
          ) : (
            <>
              <ul className="mt-3 space-y-1.5 text-sm">
                {preview.lines.map((l) => (
                  <li key={l.name} className="flex justify-between gap-3">
                    <span className="text-ink-soft">{l.name}{l.quantity > 1 ? ` × ${l.quantity}` : ""}</span>
                    <span>{formatBRL(l.totalCents)}</span>
                  </li>
                ))}
              </ul>
              <dl className="mt-3 space-y-1.5 border-t border-line pt-3 text-sm">
                <div className="flex justify-between"><dt className="text-muted">Valor do profissional</dt><dd>{formatBRL(preview.providerSubtotalCents)}</dd></div>
                {preview.commissionMode === "ON_TOP" ? (
                  <div className="flex justify-between"><dt className="text-muted">Taxa de serviço ({formatBps(preview.commissionRateBps)})</dt><dd>{formatBRL(preview.commissionCents)}</dd></div>
                ) : null}
                <div className="flex justify-between border-t border-line pt-2 text-base font-bold"><dt>Total</dt><dd className="text-brand">{formatBRL(preview.totalCents)}</dd></div>
              </dl>
              <p className="mt-2 text-xs text-muted">Duração estimada: {formatMinutes(preview.durationMinutes)}</p>
            </>
          )}

          {slotStart ? (
            <div className="mt-5 space-y-3 border-t border-line pt-4">
              <label className="flex items-start gap-2 text-sm">
                <input type="checkbox" checked={accept} onChange={(e) => setAccept(e.target.checked)} className="mt-0.5 size-4 accent-[var(--color-brand)]" />
                <span>
                  Aceito os <Link href="/termos" target="_blank" className="font-medium text-brand hover:underline">termos</Link> e a{" "}
                  <Link href="/cancelamento" target="_blank" className="font-medium text-brand hover:underline">política de cancelamento</Link>.
                </span>
              </label>
              {service.cancellation ? <p className="text-xs text-muted">{service.cancellation}</p> : null}
            </div>
          ) : null}

          {error ? <p className="mt-4 rounded-xl bg-danger-soft px-3 py-2 text-sm font-medium text-danger" role="alert">{error}</p> : null}

          <Button className="mt-5 w-full" disabled={!ready || submitting} onClick={submit}>
            {submitting ? <LoaderCircle className="size-4 animate-spin" aria-hidden /> : null}
            {submitting ? "Enviando…" : "Enviar solicitação"}
          </Button>
          <p className="mt-2 text-center text-xs text-muted">O profissional confirma o pedido antes de qualquer cobrança. O horário fica segurado enquanto isso.</p>
        </Card>
      </aside>
    </div>
  );
}
