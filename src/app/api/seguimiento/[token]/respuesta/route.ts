import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const respuestaSchema = z.object({
  decision: z.enum(["APROBADO", "RECHAZADO"]),
});

const NO_ESPERA_RESPUESTA = "Esta reparación ya no está esperando una respuesta.";

// POST /api/seguimiento/[token]/respuesta — público, sin sesión. El cliente
// aprueba o rechaza el presupuesto. Es la única acción que puede hacer, y
// solo mientras la reparación está en AUTORIZAR: no usa la tabla general de
// transiciones, porque desde ahí también saldrían cambios internos del taller.
export async function POST(
  request: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;

  const body = await request.json().catch(() => null);
  const parsed = respuestaSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Datos inválidos." }, { status: 400 });
  }
  const { decision } = parsed.data;

  const reparacion = await prisma.reparacion.findUnique({
    where: { linkToken: token },
    select: { id: true, estado: true, montoPresupuesto: true },
  });
  if (!reparacion) {
    return NextResponse.json({ error: "No encontrado." }, { status: 404 });
  }
  if (reparacion.estado !== "AUTORIZAR" || reparacion.montoPresupuesto === null) {
    return NextResponse.json({ error: NO_ESPERA_RESPUESTA }, { status: 400 });
  }

  const aplicada = await prisma.$transaction(async (tx) => {
    // Condicionado a AUTORIZAR: si el cliente hace doble click o el admin
    // cambió el estado en el medio, solo se aplica la primera respuesta.
    const { count } = await tx.reparacion.updateMany({
      where: { id: reparacion.id, estado: "AUTORIZAR" },
      data: { estado: decision },
    });
    if (count === 0) return false;

    await tx.historialEstado.create({
      data: {
        reparacionId: reparacion.id,
        estadoAnterior: "AUTORIZAR",
        estadoNuevo: decision,
        usuarioId: null,
      },
    });
    return true;
  });

  if (!aplicada) {
    return NextResponse.json({ error: NO_ESPERA_RESPUESTA }, { status: 409 });
  }

  return NextResponse.json({ ok: true, estado: decision });
}
