export type ChecklistLike = { category: string | null };
export type ChecklistGroup<T> = { category: string | null; items: T[] };

/** Agrupa itens de checklist pela categoria, preservando a ordem de primeira
 * ocorrência — usado tanto no checklist do processo quanto no checklist
 * padrão do modelo de serviço (mesma lógica, dois domínios). */
export function groupChecklistItems<T extends ChecklistLike>(items: T[]): ChecklistGroup<T>[] {
  const groups: ChecklistGroup<T>[] = [];
  const indexByCategory = new Map<string, number>();

  for (const item of items) {
    const key = item.category ?? "\0uncategorized";
    let index = indexByCategory.get(key);
    if (index === undefined) {
      index = groups.length;
      indexByCategory.set(key, index);
      groups.push({ category: item.category, items: [] });
    }
    groups[index].items.push(item);
  }

  return groups;
}
