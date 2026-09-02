/** Mesma lógica de hasUnreadClientComment (modules/processes/labels.ts),
 * aplicada ao chat geral do cliente em vez de comentários por processo. */
export function hasUnreadMessage(lastMessageAt: Date | null, lastReadAt: Date | null): boolean {
  if (!lastMessageAt) return false;
  if (!lastReadAt) return true;
  return lastMessageAt.getTime() > lastReadAt.getTime();
}
