import { ActionForm } from "@/components/action-form";
import { AddressForm } from "@/components/address-form";
import { Badge, Card, EmptyState, PageHeader } from "@/components/ui/surface";
import { requirePageRole } from "@/server/auth";
import { db } from "@/server/db";
import { deleteAddressAction } from "../actions";

export default async function AddressesPage() {
  const user = await requirePageRole(["CUSTOMER"], "/conta/enderecos");
  const addresses = await db.address.findMany({ where: { userId: user.id }, orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }] });

  return (
    <>
      <PageHeader title="Endereços" description="Onde os serviços serão realizados. O endereço completo só é compartilhado com o profissional após o pagamento." />

      {addresses.length === 0 ? (
        <EmptyState title="Nenhum endereço cadastrado" description="Adicione abaixo o endereço onde o serviço será feito." />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {addresses.map((a) => (
            <Card key={a.id} className="p-5">
              <details>
                <summary className="flex cursor-pointer list-none items-start justify-between gap-3">
                  <span>
                    <span className="flex items-center gap-2 font-semibold">
                      {a.label} {a.isDefault ? <Badge tone="brand">Principal</Badge> : null}
                    </span>
                    <span className="mt-1 block text-sm text-muted">
                      {a.street}, {a.number}{a.complement ? ` – ${a.complement}` : ""} · {a.neighborhood} · {a.city}/{a.state}
                    </span>
                  </span>
                  <span className="shrink-0 text-sm font-medium text-brand">Editar</span>
                </summary>
                <div className="mt-4 border-t border-line pt-4">
                  <AddressForm
                    initial={{
                      id: a.id,
                      label: a.label,
                      cep: `${a.cep.slice(0, 5)}-${a.cep.slice(5)}`,
                      street: a.street,
                      number: a.number,
                      complement: a.complement ?? "",
                      neighborhood: a.neighborhood,
                      city: a.city,
                      state: a.state,
                      notes: a.notes ?? "",
                      isDefault: a.isDefault,
                    }}
                  />
                  <ActionForm action={deleteAddressAction} submitLabel="Remover endereço" variant="ghost" confirm="Remover este endereço?" className="mt-3">
                    <input type="hidden" name="id" value={a.id} />
                  </ActionForm>
                </div>
              </details>
            </Card>
          ))}
        </div>
      )}

      <Card className="mt-8 p-6">
        <h2 className="mb-4 font-semibold">Novo endereço</h2>
        <AddressForm />
      </Card>
    </>
  );
}
