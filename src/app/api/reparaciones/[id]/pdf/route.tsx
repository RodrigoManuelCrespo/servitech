import { NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { prisma } from "@/lib/prisma";
import { requireApiSession } from "@/lib/session";
import { OrdenReparacionPdf } from "@/components/pdf/orden-reparacion";
import type { ChecklistRecepcion } from "@/lib/checklist";

export const runtime = "nodejs";

// GET /api/reparaciones/[id]/pdf — genera la orden en PDF al vuelo (no se
// persiste en ningún storage). Mismas reglas de acceso que el resto del
// módulo: ver src/app/api/reparaciones/[id]/route.ts.
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await requireApiSession();
  if (!session) {
    return NextResponse.json({ error: "No autenticado." }, { status: 401 });
  }

  const { id } = await params;

  const reparacion = await prisma.reparacion.findFirst({
    where: { id, empresaId: session.user.empresaId },
    select: {
      id: true,
      estado: true,
      diagnostico: true,
      checklist: true,
      fechaIngreso: true,
      fechaEntrega: true,
      tecnicoAsignadoId: true,
      equipo: {
        select: {
          tipo: true,
          marca: true,
          modelo: true,
          numeroSerie: true,
          cliente: { select: { nombre: true, telefono: true, email: true } },
        },
      },
      tecnicoAsignado: { select: { nombre: true } },
    },
  });

  if (!reparacion) {
    return NextResponse.json({ error: "Reparación no encontrada." }, { status: 404 });
  }

  if (session.user.rol === "TECNICO" && reparacion.tecnicoAsignadoId !== session.user.id) {
    return NextResponse.json(
      { error: "No tenés acceso a esta reparación." },
      { status: 403 },
    );
  }

  const empresa = await prisma.empresa.findUnique({
    where: { id: session.user.empresaId },
    select: { nombre: true, telefono: true, email: true, logoUrl: true },
  });

  const buffer = await renderToBuffer(
    <OrdenReparacionPdf
      reparacion={{
        id: reparacion.id,
        estado: reparacion.estado,
        diagnostico: reparacion.diagnostico,
        checklist: reparacion.checklist as ChecklistRecepcion | null,
        fechaIngreso: reparacion.fechaIngreso,
        fechaEntrega: reparacion.fechaEntrega,
        equipo: reparacion.equipo,
        tecnicoAsignado: reparacion.tecnicoAsignado,
      }}
      empresa={{
        nombre: empresa?.nombre ?? "ServiTech",
        telefono: empresa?.telefono ?? null,
        email: empresa?.email ?? null,
        logoUrl: empresa?.logoUrl ?? null,
      }}
    />,
  );

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="orden-r${id.slice(-4)}.pdf"`,
    },
  });
}
