"use client";

import { useActionState } from "react";
import { FormMessage, SubmitButton, Textarea, type FormState } from "@/components/ui/form";
import { replyToReviewAction } from "../actions";

export function ReplyForm({ reviewId }: { reviewId: string }) {
  const [state, action] = useActionState(replyToReviewAction, {} as FormState);
  if (state.ok) return <FormMessage state={state} />;

  return (
    <details className="ml-4 rounded-xl bg-canvas p-3">
      <summary className="cursor-pointer text-sm font-semibold text-brand">Responder publicamente</summary>
      <form action={action} className="mt-3 space-y-3">
        <input type="hidden" name="reviewId" value={reviewId} />
        <FormMessage state={state} />
        <Textarea
          name="reply"
          rows={3}
          maxLength={600}
          defaultValue={state.values?.reply}
          placeholder="Agradeça ou esclareça com educação. A resposta fica visível no seu perfil e não pode ser editada."
          aria-label="Resposta"
        />
        {state.errors?.reply ? <p className="text-xs text-danger">{state.errors.reply[0]}</p> : null}
        <SubmitButton pendingText="Publicando…">Publicar resposta</SubmitButton>
      </form>
    </details>
  );
}
