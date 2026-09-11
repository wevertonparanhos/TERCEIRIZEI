import { requireRole } from "@/lib/rbac";
import { ProfileForm } from "@/modules/account/profile-form";

export default async function PortalProfilePage() {
  const user = await requireRole("CLIENT");

  return (
    <div>
      <h1 className="mb-6 text-xl font-semibold text-ink">Meu Perfil</h1>
      <div className="rounded-lg border border-border bg-surface p-6">
        <ProfileForm defaultName={user.name} email={user.email} />
      </div>
    </div>
  );
}
