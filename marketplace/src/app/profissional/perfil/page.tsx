import { Card, PageHeader } from "@/components/ui/surface";
import { requirePageRole } from "@/server/auth";
import { db } from "@/server/db";
import { ProviderProfileForm } from "./provider-profile-form";

export default async function ProviderProfilePage() {
  const user = await requirePageRole(["PROVIDER"], "/profissional/perfil");
  const p = await db.providerProfile.findUniqueOrThrow({ where: { userId: user.id } });

  return (
    <>
      <PageHeader title="Perfil profissional" description="É assim que os clientes vão conhecer você." />
      <Card className="p-6">
        <ProviderProfileForm
          values={{
            displayName: p.displayName,
            bio: p.bio ?? "",
            phone: p.phone ?? user.phone ?? "",
            whatsapp: p.whatsapp ?? "",
            baseCity: p.baseCity ?? "",
            baseState: p.baseState ?? "",
            experienceYears: p.experienceYears?.toString() ?? "",
            qualifications: p.qualifications ?? "",
          }}
        />
      </Card>
    </>
  );
}
