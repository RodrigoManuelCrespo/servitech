import { requireSession } from "@/lib/session";
import { ReparacionesList } from "./reparaciones-list";

export default async function ReparacionesPage() {
  const session = await requireSession();

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-3xl font-bold">Reparaciones</h1>
        <span className="rounded-full border border-border bg-secondary px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
          ADMIN · TECNICO
        </span>
      </div>
      <ReparacionesList rol={session.user.rol} />
    </div>
  );
}
