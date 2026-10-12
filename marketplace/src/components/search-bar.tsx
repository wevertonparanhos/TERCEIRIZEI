import { Search } from "lucide-react";
import { db } from "@/server/db";
import { buttonClass } from "./ui/button";
import { Select } from "./ui/form";

/** Busca rápida (categoria + cidade). Formulário GET: funciona sem JavaScript. */
export async function SearchBar({ categoria, cidade }: { categoria?: string; cidade?: string }) {
  const [categories, cities] = await Promise.all([
    db.serviceCategory.findMany({ where: { active: true, parentId: null }, orderBy: { sortOrder: "asc" }, select: { slug: true, name: true } }),
    db.city.findMany({ where: { active: true }, orderBy: [{ state: "asc" }, { name: "asc" }], select: { slug: true, name: true, state: true } }),
  ]);

  return (
    <form action="/buscar" method="get" role="search" className="grid gap-2 rounded-[1.5rem] border border-line bg-surface p-2 shadow-[var(--shadow-card)] sm:grid-cols-[1fr_1fr_auto]">
      <Select name="categoria" defaultValue={categoria ?? ""} aria-label="Serviço" className="rounded-none border-0 border-b border-line bg-transparent sm:border-b-0">
        <option value="">Qualquer serviço</option>
        {categories.map((c) => <option key={c.slug} value={c.slug}>{c.name}</option>)}
      </Select>
      <Select name="cidade" defaultValue={cidade ?? ""} aria-label="Cidade" className="rounded-none border-0 border-b border-line bg-transparent sm:border-b-0 sm:border-l">
        <option value="">Todas as cidades</option>
        {cities.map((c) => <option key={c.slug} value={c.slug}>{c.name}/{c.state}</option>)}
      </Select>
      <button type="submit" className={buttonClass("primary", "md")}>
        <Search className="size-4" aria-hidden /> Buscar
      </button>
    </form>
  );
}
