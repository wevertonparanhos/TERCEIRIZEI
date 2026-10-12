import type { Metadata } from "next";
import { CategoryCard } from "@/components/category-card";
import { EmptyState, PageHeader } from "@/components/ui/surface";
import { listCategories } from "@/server/catalog";

export const metadata: Metadata = { title: "Serviços" };

export default async function ServicesPage() {
  const categories = await listCategories();

  return (
    <div className="container-page py-10">
      <PageHeader
        title="Serviços"
        description="Escolha uma categoria para ver os pacotes, o que está incluso e os preços dos profissionais."
      />
      {categories.length === 0 ? (
        <EmptyState title="Nenhuma categoria disponível" description="Volte em breve: estamos cadastrando os serviços." />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {categories.map((c) => (
            <CategoryCard key={c.id} {...c} />
          ))}
        </div>
      )}
    </div>
  );
}
