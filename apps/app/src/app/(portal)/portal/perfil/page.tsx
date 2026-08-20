import { getCurrentUser } from "@/lib/rbac";
import { AccountForm } from "@/modules/account/account-form";
import { updateProfile } from "@/modules/account/actions";

export default async function PortalPerfilPage() {
  const user = await getCurrentUser();
  if (!user) return null;

  return <AccountForm name={user.name} email={user.email} roleLabel="Cliente" updateProfile={updateProfile} />;
}
