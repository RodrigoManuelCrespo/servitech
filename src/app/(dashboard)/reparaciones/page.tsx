import { requireSession } from "@/lib/session";
import { ReparacionesList } from "./reparaciones-list";

export default async function ReparacionesPage() {
  const session = await requireSession();

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Reparaciones</h1>
      <ReparacionesList rol={session.user.rol} />
    </div>
  );
}
