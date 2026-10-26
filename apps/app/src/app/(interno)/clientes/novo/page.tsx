import { redirect } from "next/navigation";

export default function NovoClientePage() {
  redirect("/clientes?novo=1");
}
