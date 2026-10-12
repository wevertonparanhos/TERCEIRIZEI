import { Card, PageHeader } from "@/components/ui/surface";
import { requirePageRole } from "@/server/auth";
import { ProfileForm } from "./profile-form";

export default async function CustomerProfilePage() {
  const user = await requirePageRole(["CUSTOMER"], "/conta/perfil");
  return (
    <>
      <PageHeader title="Meus dados" description="Informações usadas nos seus pedidos." />
      <Card className="p-6">
        <ProfileForm name={user.name} phone={user.phone ?? ""} email={user.email} />
      </Card>
    </>
  );
}
