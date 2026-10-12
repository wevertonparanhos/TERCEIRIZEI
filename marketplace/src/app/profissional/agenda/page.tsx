import { Button } from "@/components/ui/button";
import { Card, PageHeader } from "@/components/ui/surface";
import { addDays, minutesToHHMM, utcToLocalDate } from "@/domain/availability";
import { requirePageRole } from "@/server/auth";
import { db } from "@/server/db";
import { removeTimeOffAction } from "../actions";
import { AvailabilityForm, ServiceAreasForm, TimeOffForm, type DayValue } from "./schedule-forms";

const fmtDate = (d: string) => d.split("-").reverse().join("/");

export default async function ProviderSchedulePage() {
  const user = await requirePageRole(["PROVIDER"], "/profissional/agenda");
  const provider = await db.providerProfile.findUniqueOrThrow({
    where: { userId: user.id },
    include: {
      availability: true,
      serviceAreas: true,
      timeOff: { where: { endsAt: { gt: new Date() } }, orderBy: { startsAt: "asc" } },
    },
  });
  const cities = await db.city.findMany({ where: { active: true }, orderBy: [{ state: "asc" }, { name: "asc" }] });

  const days: DayValue[] = Array.from({ length: 7 }, (_, d) => {
    const w = provider.availability.find((a) => a.weekday === d);
    return w ? { on: true, start: minutesToHHMM(w.startMinute), end: minutesToHHMM(w.endMinute) } : { on: false, start: "08:00", end: "18:00" };
  });
  const today = utcToLocalDate(new Date());

  return (
    <>
      <PageHeader title="Agenda e regiões" description="Defina quando e onde você atende. Os clientes só veem horários livres dentro da sua agenda." />

      <div className="grid gap-6 xl:grid-cols-2">
        <Card className="p-6">
          <h2 className="mb-4 font-semibold">Dias e horários de trabalho</h2>
          <AvailabilityForm days={days} bufferMinutes={provider.bufferMinutes} />
        </Card>

        <div className="space-y-6">
          <Card className="p-6">
            <h2 className="mb-4 font-semibold">Cidades atendidas</h2>
            <ServiceAreasForm
              cities={cities.map((c) => {
                const area = provider.serviceAreas.find((a) => a.cityId === c.id);
                return { id: c.id, name: c.name, state: c.state, selected: !!area, neighborhoods: area?.neighborhoods.join(", ") ?? "" };
              })}
            />
          </Card>

          <Card className="p-6">
            <h2 className="mb-4 font-semibold">Folgas e bloqueios</h2>
            <TimeOffForm today={today} />
            {provider.timeOff.length > 0 ? (
              <ul className="mt-5 divide-y divide-line text-sm">
                {provider.timeOff.map((t) => {
                  const from = utcToLocalDate(t.startsAt);
                  const to = addDays(utcToLocalDate(t.endsAt), -1);
                  return (
                    <li key={t.id} className="flex items-center justify-between gap-3 py-2.5">
                      <span>
                        {from === to ? fmtDate(from) : `${fmtDate(from)} a ${fmtDate(to)}`}
                        {t.reason ? <span className="text-muted"> · {t.reason}</span> : null}
                      </span>
                      <form action={removeTimeOffAction}>
                        <input type="hidden" name="id" value={t.id} />
                        <Button type="submit" variant="ghost" size="sm">Remover</Button>
                      </form>
                    </li>
                  );
                })}
              </ul>
            ) : null}
          </Card>
        </div>
      </div>
    </>
  );
}
