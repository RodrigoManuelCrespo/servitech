import "server-only";
import { renderToBuffer } from "@react-pdf/renderer";
import { prisma } from "@/lib/prisma";
import { OrdenRecepcionPdf } from "@/components/pdf/orden-recepcion";
import type { ChecklistRecepcion } from "@/lib/checklist";

// Genera la orden de recepción en PDF. Devuelve null si la reparación no
// existe o no es de la empresa. Lo usan la descarga y el envío por email.
export async function generarOrdenRecepcion(
  reparacionId: string,
  empresaId: string,
): Promise<Buffer | null> {
  const [reparacion, empresa] = await Promise.all([
    prisma.reparacion.findFirst({
      where: { id: reparacionId, empresaId },
      select: {
        id: true,
        checklist: true,
        fechaIngreso: true,
        equipo: {
          select: {
            tipo: true,
            marca: true,
            modelo: true,
            numeroSerie: true,
            observaciones: true,
            cliente: { select: { nombre: true, telefono: true, email: true } },
          },
        },
      },
    }),
    prisma.empresa.findUnique({
      where: { id: empresaId },
      select: { nombre: true, telefono: true, email: true, logoUrl: true },
    }),
  ]);

  if (!reparacion || !empresa) return null;

  return renderToBuffer(
    <OrdenRecepcionPdf
      reparacion={{ ...reparacion, checklist: reparacion.checklist as ChecklistRecepcion | null }}
      empresa={empresa}
    />,
  );
}
