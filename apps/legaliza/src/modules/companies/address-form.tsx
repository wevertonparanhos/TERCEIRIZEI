"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { addressSchema, type AddressInput } from "@/lib/validations/address";
import { saveAddress } from "@/modules/companies/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function AddressForm({
  companyId,
  defaultValues,
}: {
  companyId: string;
  defaultValues?: Partial<AddressInput>;
}) {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [saved, setSaved] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<AddressInput>({ resolver: zodResolver(addressSchema), defaultValues });

  async function submit(data: AddressInput) {
    setServerError(null);
    setSaved(false);
    setSubmitting(true);
    try {
      await saveAddress(companyId, data);
      setSaved(true);
      router.refresh();
    } catch (err) {
      setServerError(err instanceof Error ? err.message : "Não foi possível salvar o endereço.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit(submit)} method="post" className="space-y-4" noValidate>
      <div className="grid grid-cols-3 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="cep">CEP</Label>
          <Input id="cep" {...register("cep")} />
          {errors.cep && <p className="text-xs text-red-600">{errors.cep.message}</p>}
        </div>
        <div className="col-span-2 space-y-1.5">
          <Label htmlFor="street">Logradouro</Label>
          <Input id="street" {...register("street")} />
          {errors.street && <p className="text-xs text-red-600">{errors.street.message}</p>}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="number">Número</Label>
          <Input id="number" {...register("number")} />
          {errors.number && <p className="text-xs text-red-600">{errors.number.message}</p>}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="complement">Complemento</Label>
          <Input id="complement" {...register("complement")} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="neighborhood">Bairro</Label>
          <Input id="neighborhood" {...register("neighborhood")} />
          {errors.neighborhood && <p className="text-xs text-red-600">{errors.neighborhood.message}</p>}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="city">Cidade</Label>
          <Input id="city" {...register("city")} />
          {errors.city && <p className="text-xs text-red-600">{errors.city.message}</p>}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="state">UF</Label>
          <Input id="state" maxLength={2} {...register("state")} />
          {errors.state && <p className="text-xs text-red-600">{errors.state.message}</p>}
        </div>
      </div>

      {serverError && <p className="text-xs text-red-600">{serverError}</p>}
      {saved && <p className="text-xs text-emerald-600">Endereço salvo.</p>}

      <Button type="submit" size="sm" disabled={submitting}>
        {submitting ? "Salvando..." : "Salvar Endereço"}
      </Button>
    </form>
  );
}
