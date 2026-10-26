import { redirect } from "next/navigation";

export default function NovoProcessoPage({ searchParams }: { searchParams: { area?: string } }) {
  redirect(`/processos?nova=1${searchParams.area ? `&area=${searchParams.area}` : ""}`);
}
