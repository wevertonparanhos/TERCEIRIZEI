"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

type Comment = {
  id: string;
  body: string;
  createdAt: string;
  authorName: string;
  authorIsClient: boolean;
  mentionedNames: string[];
};
type StaffUser = { id: string; name: string };

const MENTION_QUERY_PATTERN = /@([\wÀ-ÿ]*)$/;

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function renderCommentBody(body: string, mentionedNames: string[]) {
  if (mentionedNames.length === 0) return body;

  const pattern = new RegExp(`@(?:${mentionedNames.map(escapeRegExp).join("|")})`, "g");
  const parts: { text: string; isMention: boolean }[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(body))) {
    if (match.index > lastIndex) parts.push({ text: body.slice(lastIndex, match.index), isMention: false });
    parts.push({ text: match[0], isMention: true });
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < body.length) parts.push({ text: body.slice(lastIndex), isMention: false });

  return parts.map((part, i) =>
    part.isMention ? (
      <span key={i} className="font-medium text-accent">
        {part.text}
      </span>
    ) : (
      <span key={i}>{part.text}</span>
    )
  );
}

export function ProcessComments({
  processId,
  comments,
  addComment,
  mentionable,
}: {
  processId: string;
  comments: Comment[];
  addComment: (processId: string, body: string, mentionedUserIds: string[]) => Promise<void>;
  mentionable?: StaffUser[];
}) {
  const router = useRouter();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [body, setBody] = useState("");
  const [mentionedIds, setMentionedIds] = useState<string[]>([]);
  const [mentionQuery, setMentionQuery] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const mentionMatches =
    mentionQuery !== null && mentionable
      ? mentionable.filter((s) => s.name.toLowerCase().includes(mentionQuery.toLowerCase())).slice(0, 5)
      : [];

  function handleChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    const value = e.target.value;
    setBody(value);
    if (!mentionable) return;
    const beforeCursor = value.slice(0, e.target.selectionStart ?? value.length);
    const match = beforeCursor.match(MENTION_QUERY_PATTERN);
    setMentionQuery(match ? match[1] : null);
  }

  function selectMention(member: StaffUser) {
    const textarea = textareaRef.current;
    const cursor = textarea?.selectionStart ?? body.length;
    const beforeCursor = body.slice(0, cursor);
    const afterCursor = body.slice(cursor);
    const newBefore = beforeCursor.replace(MENTION_QUERY_PATTERN, `@${member.name} `);
    setBody(newBefore + afterCursor);
    setMentionedIds((prev) => (prev.includes(member.id) ? prev : [...prev, member.id]));
    setMentionQuery(null);
    requestAnimationFrame(() => textarea?.focus());
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!body.trim()) return;
    setSubmitting(true);
    setError(null);
    try {
      await addComment(processId, body, mentionedIds);
      setBody("");
      setMentionedIds([]);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível enviar o comentário.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div>
      <h3 className="text-sm font-semibold text-ink">
        Comentários {comments.length > 0 && <span className="font-normal text-muted-soft">({comments.length})</span>}
      </h3>

      {comments.length === 0 && <p className="mt-3 text-sm text-muted-soft">Nenhum comentário ainda.</p>}

      {comments.length > 0 && (
        <ul className="mt-3 space-y-3">
          {comments.map((comment) => (
            <li key={comment.id} className="rounded-md bg-surface-alt p-3">
              <div className="flex items-center gap-2 text-xs text-muted">
                <span className="font-medium text-ink">{comment.authorName}</span>
                {comment.authorIsClient && (
                  <span className="rounded-full bg-accent-soft px-2 py-0.5 text-[11px] text-accent">Cliente</span>
                )}
                <span>{new Date(comment.createdAt).toLocaleString("pt-BR")}</span>
              </div>
              <p className="mt-1.5 whitespace-pre-wrap text-sm text-ink">
                {renderCommentBody(comment.body, comment.mentionedNames)}
              </p>
            </li>
          ))}
        </ul>
      )}

      <form onSubmit={handleSubmit} className="relative mt-4 space-y-2 border-t border-border pt-4">
        <Textarea
          ref={textareaRef}
          value={body}
          onChange={handleChange}
          rows={3}
          placeholder={mentionable ? "Escreva um comentário... use @ para mencionar alguém da equipe" : "Escreva um comentário..."}
        />
        {mentionMatches.length > 0 && (
          <ul className="absolute z-10 w-56 rounded-md border border-border bg-surface shadow-md">
            {mentionMatches.map((member) => (
              <li key={member.id}>
                <button
                  type="button"
                  onClick={() => selectMention(member)}
                  className="block w-full px-3 py-1.5 text-left text-sm text-ink hover:bg-surface-alt"
                >
                  {member.name}
                </button>
              </li>
            ))}
          </ul>
        )}
        <Button type="submit" size="sm" disabled={submitting || !body.trim()}>
          {submitting ? "Enviando..." : "Comentar"}
        </Button>
      </form>
      {error && <p className="mt-2 rounded-md bg-red-50 dark:bg-red-500/10 px-3 py-2 text-sm text-red-700 dark:text-red-400">{error}</p>}
    </div>
  );
}
