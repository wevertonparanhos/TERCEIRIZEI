"use client";

import { useActionState, useState } from "react";
import { Check } from "lucide-react";
import { StarInput } from "@/components/reviews/star-input";
import { FormMessage, SubmitButton, Textarea, type FormState } from "@/components/ui/form";
import { CRITERIA, tagsForRating } from "@/domain/review-options";
import { cn } from "@/lib/utils";
import { createReviewAction } from "../../../actions";

export function ReviewForm({ bookingId, providerFirstName }: { bookingId: string; providerFirstName: string }) {
  const [state, action] = useActionState(createReviewAction, {} as FormState);
  const [rating, setRating] = useState(Number(state.values?.rating) || 0);
  const [criteria, setCriteria] = useState<Record<string, number>>({});
  const [tags, setTags] = useState<string[]>([]);

  const options = rating ? tagsForRating(rating) : {};
  const lowRating = rating > 0 && rating <= 2;

  return (
    <form action={action} className="space-y-8" noValidate>
      <input type="hidden" name="bookingId" value={bookingId} />
      <FormMessage state={state} />

      <section className="text-center">
        <p className="text-lg font-semibold">Como foi o serviço de {providerFirstName}?</p>
        <div className="mt-4 flex justify-center">
          <StarInput
            name="rating"
            label="Nota geral"
            value={rating}
            onChange={(n) => {
              // Ao cruzar entre elogio e melhoria, as opções mudam: limpa as escolhidas.
              if ((n >= 4) !== (rating >= 4)) setTags([]);
              setRating(n);
            }}
          />
        </div>
        {state.errors?.rating ? <p className="mt-2 text-sm text-danger">{state.errors.rating[0]}</p> : null}
      </section>

      {rating > 0 ? (
        <>
          <section>
            <p className="mb-3 font-semibold">{rating >= 4 ? "O que se destacou?" : "O que pode melhorar?"}</p>
            <div className="flex flex-wrap gap-2">
              {Object.entries(options).map(([key, label]) => {
                const on = tags.includes(key);
                return (
                  <label
                    key={key}
                    className={cn(
                      "inline-flex cursor-pointer items-center gap-1.5 rounded-full border px-3.5 py-2 text-sm font-medium transition",
                      on ? "border-ink bg-ink text-white" : "border-line-strong bg-surface text-ink-soft hover:border-ink/40",
                    )}
                  >
                    <input
                      type="checkbox"
                      name="tags"
                      value={key}
                      checked={on}
                      onChange={() => setTags((t) => (on ? t.filter((x) => x !== key) : [...t, key]))}
                      className="sr-only"
                    />
                    {on ? <Check className="size-3.5" aria-hidden /> : null}
                    {label}
                  </label>
                );
              })}
            </div>
          </section>

          <section>
            <p className="mb-1 font-semibold">Detalhe sua nota <span className="font-normal text-muted">(opcional)</span></p>
            <p className="mb-4 text-sm text-muted">Ajuda outros clientes a escolherem.</p>
            <ul className="divide-y divide-line rounded-2xl border border-line">
              {CRITERIA.map((c) => (
                <li key={c.key} className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                  <span className="text-sm font-medium">{c.label}</span>
                  <StarInput
                    name={c.key}
                    label={c.label}
                    size="md"
                    showLabel={false}
                    value={criteria[c.key] ?? 0}
                    onChange={(n) => setCriteria((v) => ({ ...v, [c.key]: n }))}
                  />
                </li>
              ))}
            </ul>
          </section>

          <section>
            <label htmlFor="comment" className="mb-2 block font-semibold">
              {lowRating ? "Conte o que aconteceu" : "Deixe um comentário"}{" "}
              {lowRating ? null : <span className="font-normal text-muted">(opcional)</span>}
            </label>
            <Textarea
              id="comment"
              name="comment"
              rows={4}
              maxLength={1000}
              defaultValue={state.values?.comment}
              placeholder={lowRating ? "Sua avaliação é analisada pela equipe para melhorar o serviço." : "Como foi a experiência?"}
              aria-invalid={!!state.errors?.comment}
            />
            {state.errors?.comment ? <p className="mt-1 text-xs text-danger">{state.errors.comment[0]}</p> : null}
            <p className="mt-2 text-xs text-muted">
              Sua avaliação será pública com seu primeiro nome e a inicial do sobrenome. Depois de enviada, não pode ser editada.
            </p>
          </section>

          <SubmitButton className="w-full" pendingText="Enviando…">Enviar avaliação</SubmitButton>
        </>
      ) : (
        <p className="text-center text-sm text-muted">Toque nas estrelas para começar.</p>
      )}
    </form>
  );
}
