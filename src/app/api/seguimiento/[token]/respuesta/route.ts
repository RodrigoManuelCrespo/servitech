import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { TRANSICIONES_VALIDAS } from "@/lib/estado";

const respuestaSchema = z.object({
  decision: z.enum(["APROBADO", "RECHAZADO"]),
});

// POST /api/seguimiento/[token]/respuesta — público, sin sesión. El
// cliente aprueba o rechaza el presupuesto. Solo tiene sentido desde
// AUTORIZAR (misma validación de transición que el PATCH interno).
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
    select: { id: true, estado: true },
  });
  if (!reparacion) {
    return NextResponse.json({ error: "No encontrado." }, { status: 404 });
  }

  const permitidos = TRANSICIONES_VALIDAS[reparacion.estado];
  if (!permitidos.includes(decision)) {
    return NextResponse.json(
      { error: "Esta reparación ya no está esperando una respuesta." },
      { status: 400 },
    );
  }

  await prisma.$transaction(async (tx) => {
    await tx.reparacion.update({
      where: { id: reparacion.id },
      data: { estado: decision },
    });
    await tx.historialEstado.create({
      data: {
        reparacionId: reparacion.id,
        estadoAnterior: reparacion.estado,
        estadoNuevo: decision,
        usuarioId: null,
      },
    });
  });

  return NextResponse.json({ ok: true, estado: decision });
}
