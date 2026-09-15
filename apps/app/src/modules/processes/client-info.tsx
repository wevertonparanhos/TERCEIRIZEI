import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { WhatsAppLink } from "@/components/whatsapp-link";

type Contact = { id: string; name: string; role: string; email: string | null; phone: string | null };
type ClientInfo = {
  id: string;
  name: string;
  fantasyName: string | null;
  type: "PF" | "PJ";
  doc: string;
  email: string;
  phone: string | null;
  whatsapp: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  contacts: Contact[];
};
type CompanyInfo = {
  razaoSocial: string;
  nomeFantasia: string | null;
  cnpj: string;
  address: string | null;
  city: string | null;
  state: string | null;
} | null;

function formatDoc(doc: string) {
  if (doc.length === 11) return doc.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
  if (doc.length === 14) return doc.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, "$1.$2.$3/$4-$5");
  return doc;
}

export function ClientInfoTab({ client, company }: { client: ClientInfo; company: CompanyInfo }) {
  const fullAddress = [client.address, client.city, client.state].filter(Boolean).join(" · ");

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-ink">Cliente</h3>
          <Link href={`/clientes/${client.id}`} className="text-xs text-accent hover:underline">
            Ver cadastro completo →
          </Link>
        </div>
        <div className="mt-3 rounded-md border border-border bg-surface p-3">
          <p className="text-sm font-medium text-ink">
            {client.name}
            {client.fantasyName ? <span className="ml-1 text-xs text-muted-soft">({client.fantasyName})</span> : null}
          </p>
          <p className="mt-1 text-xs text-muted-soft">
            {client.type === "PF" ? "Pessoa Física" : "Pessoa Jurídica"} · {formatDoc(client.doc)}
          </p>
          <dl className="mt-3 space-y-1 text-sm">
            <div className="flex gap-2">
              <dt className="w-20 flex-none text-muted-soft">E-mail</dt>
              <dd className="text-ink">{client.email}</dd>
            </div>
            {(client.phone || client.whatsapp) && (
              <div className="flex items-center gap-2">
                <dt className="w-20 flex-none text-muted-soft">Telefone</dt>
                <dd className="text-ink">{client.whatsapp || client.phone}</dd>
                <WhatsAppLink
                  phone={client.whatsapp || client.phone}
                  className={buttonVariants({ variant: "outline", size: "sm" })}
                >
                  WhatsApp
                </WhatsAppLink>
              </div>
            )}
            {fullAddress && (
              <div className="flex gap-2">
                <dt className="w-20 flex-none text-muted-soft">Endereço</dt>
                <dd className="text-ink">{fullAddress}</dd>
              </div>
            )}
          </dl>
        </div>
      </div>

      {company && (
        <div>
          <h3 className="text-sm font-semibold text-ink">Empresa</h3>
          <div className="mt-3 rounded-md border border-border bg-surface p-3">
            <p className="text-sm font-medium text-ink">
              {company.razaoSocial}
              {company.nomeFantasia ? <span className="ml-1 text-xs text-muted-soft">({company.nomeFantasia})</span> : null}
            </p>
            <p className="mt-1 text-xs text-muted-soft">CNPJ {formatDoc(company.cnpj)}</p>
            {(company.address || company.city || company.state) && (
              <p className="mt-2 text-sm text-ink">
                {[company.address, company.city, company.state].filter(Boolean).join(" · ")}
              </p>
            )}
          </div>
        </div>
      )}

      <div>
        <h3 className="text-sm font-semibold text-ink">Contatos</h3>
        {client.contacts.length === 0 ? (
          <p className="mt-2 text-sm text-muted-soft">Nenhum contato cadastrado para este cliente.</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {client.contacts.map((c) => (
              <li key={c.id} className="rounded-md border border-border bg-surface p-3">
                <p className="text-sm font-medium text-ink">
                  {c.name} <span className="text-xs text-muted-soft">· {c.role}</span>
                </p>
                <p className="mt-0.5 text-xs text-muted-soft">
                  {[c.email, c.phone].filter(Boolean).join(" · ") || "Sem contato direto"}
                </p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
