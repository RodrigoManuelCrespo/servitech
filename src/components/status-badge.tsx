import type { EstadoReparacion } from "@prisma/client";
import { cn } from "@/lib/utils";
import { ESTADO_META } from "@/lib/estado";

export function StatusBadge({ estado }: { estado: EstadoReparacion }) {
  const meta = ESTADO_META[estado];
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium",
        meta.text,
        meta.border,
        meta.bg,
      )}
    >
      {meta.label}
    </span>
  );
}
