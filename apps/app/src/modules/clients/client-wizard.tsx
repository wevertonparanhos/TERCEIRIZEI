"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Modal, Stepper } from "@/components/ui/modal";
import type { ClientInput } from "@/lib/validations/client";

const STEPS = ["Identidade", "Detalhes", "Acesso"];
const NOTES_LIMIT = 10000;

export function NewClientWizard({
  owners,
  onSubmit,
  autoOpen = false,
}: {
  owners: { id: string; name: string }[];
  onSubmit: (data: ClientInput) => Promise<{ id: string } | void>;
  autoOpen?: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(autoOpen);
  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [type, setType] = useState<"PF" | "PJ">("PJ");
  const [doc, setDoc] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [fantasyName, setFantasyName] = useState("");
  const [address, setAddress] = useState("");
  const [zipCode, setZipCode] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [notes, setNotes] = useState("");
  const [ownerUserId, setOwnerUserId] = useState("");

  function close() {
    setOpen(false);
    setStep(1);
    setError(null);
    setName("");
    setType("PJ");
    setDoc("");
    setEmail("");
    setPhone("");
    setWhatsapp("");
    setFantasyName("");
    setAddress("");
    setZipCode("");
    setCity("");
    setState("");
    setNotes("");
    setOwnerUserId("");
  }

  function stepError(): string | null {
    if (step === 1) {
      if (name.trim().length < 2) return "Informe o nome do cliente.";
      if (!doc.trim()) return "Informe o CPF ou CNPJ.";
      if (!email.trim()) return "Informe o e-mail.";
    }
    return null;
  }

  function next() {
    const err = stepError();
    if (err) return setError(err);
    setError(null);
    setStep((s) => s + 1);
  }

  async function submit() {
    const err = stepError();
    if (err) {
      setStep(1);
      return setError(err);
    }
    setSubmitting(true);
    setError(null);
    try {
      const result = await onSubmit({
        name: name.trim(),
        type,
        doc,
        email: email.trim(),
        phone,
        whatsapp,
        fantasyName,
        address,
        zipCode,
        city,
        state,
        notes,
        status: "ativo",
        ownerUserId,
      });
      close();
      if (result?.id) router.push(`/clientes/${result.id}`);
      else router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Não foi possível cadastrar o cliente.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <Button type="button" onClick={() => setOpen(true)}>
        <Plus className="mr-1.5 h-4 w-4" /> Novo Cliente
      </Button>
      <Modal
        open={open}
        onClose={close}
        title="Novo cliente"
        description="Preencha os dados para começar"
        footer={
          <>
            <Button type="button" variant="ghost" onClick={close}>
              Cancelar
            </Button>
            <div className="flex gap-2">
              {step > 1 && (
                <Button type="button" variant="outline" onClick={() => setStep((s) => s - 1)}>
                  Voltar
                </Button>
              )}
              {step < STEPS.length ? (
                <Button type="button" onClick={next}>
                  Próximo
                </Button>
              ) : (
                <Button type="button" onClick={submit} disabled={submitting}>
                  {submitting ? "Adicionando..." : "Adicionar"}
                </Button>
              )}
            </div>
          </>
        }
      >
        <Stepper steps={STEPS} current={step} />

        {step === 1 && (
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="nc-name">Nome *</Label>
              <Input id="nc-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Nome do cliente" autoFocus />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="nc-type">Tipo</Label>
                <Select id="nc-type" value={type} onChange={(e) => setType(e.target.value as "PF" | "PJ")}>
                  <option value="PJ">Pessoa Jurídica</option>
                  <option value="PF">Pessoa Física</option>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="nc-doc">{type === "PJ" ? "CNPJ *" : "CPF *"}</Label>
                <Input id="nc-doc" value={doc} onChange={(e) => setDoc(e.target.value)} placeholder={type === "PJ" ? "00.000.000/0000-00" : "000.000.000-00"} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="nc-email">Email *</Label>
              <Input id="nc-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="email@exemplo.com" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="nc-phone">Telefone</Label>
                <Input id="nc-phone" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="(00) 00000-0000" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="nc-whats">WhatsApp</Label>
                <Input id="nc-whats" value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} placeholder="(00) 00000-0000" />
              </div>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="nc-fantasy">Nome fantasia</Label>
              <Input id="nc-fantasy" value={fantasyName} onChange={(e) => setFantasyName(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="nc-address">Endereço</Label>
              <Input id="nc-address" value={address} onChange={(e) => setAddress(e.target.value)} />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="nc-zip">CEP</Label>
                <Input id="nc-zip" value={zipCode} onChange={(e) => setZipCode(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="nc-city">Cidade</Label>
                <Input id="nc-city" value={city} onChange={(e) => setCity(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="nc-state">UF</Label>
                <Input id="nc-state" value={state} maxLength={2} onChange={(e) => setState(e.target.value.toUpperCase())} />
              </div>
            </div>
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="nc-notes">Anotações</Label>
                <span className="text-xs text-muted-soft">
                  {notes.length}/{NOTES_LIMIT.toLocaleString("pt-BR")}
                </span>
              </div>
              <Textarea id="nc-notes" rows={4} maxLength={NOTES_LIMIT} value={notes} onChange={(e) => setNotes(e.target.value)} />
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4">
            <div>
              <p className="text-sm font-semibold text-ink">Responsável</p>
              <p className="text-xs text-muted">Defina quem na equipe cuida deste cliente.</p>
            </div>
            <Select value={ownerUserId} onChange={(e) => setOwnerUserId(e.target.value)} aria-label="Responsável">
              <option value="">Sem responsável definido</option>
              {owners.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.name}
                </option>
              ))}
            </Select>
          </div>
        )}

        {error && (
          <p role="alert" className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-500/10 dark:text-red-400">
            {error}
          </p>
        )}
      </Modal>
    </>
  );
}
