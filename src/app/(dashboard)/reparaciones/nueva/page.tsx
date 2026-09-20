import { requireSession } from "@/lib/session";
import { Wizard } from "./wizard";

export default async function NuevaRecepcionPage() {
  await requireSession();

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <h1 className="text-3xl font-bold">Nueva recepción de equipo</h1>
      <Wizard />
    </div>
  );
}
