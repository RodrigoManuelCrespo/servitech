import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/seguimiento/[token] — público, sin sesión. Lo ve el cliente
// desde el link que le mandó el admin. Devuelve SOLO lo que necesita ver:
// nunca el diagnóstico interno, el técnico asignado ni el historial.
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;

  const reparacion = await prisma.reparacion.findUnique({
    where: { linkToken: token },
    select: {
      estado: true,
      montoPresupuesto: true,
      mensajePresupuesto: true,
      equipo: {
        select: {
          tipo: true,
          marca: true,
          modelo: true,
        },
      },
      empresa: {
        select: { nombre: true, logoUrl: true, telefono: true },
      },
    },
  });

  // 404 genérico: no distinguir "token inválido" de "reparación de otra
  // empresa" de "todavía no tiene presupuesto enviado".
  if (!reparacion) {
    return NextResponse.json({ error: "No encontrado." }, { status: 404 });
  }

  return NextResponse.json(reparacion);
}
