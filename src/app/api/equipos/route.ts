import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireApiSession } from "@/lib/session";
import { EQUIPO_TIPOS } from "@/lib/equipo-tipos";

// GET /api/equipos?clienteId=xxx — equipos existentes de un cliente.
export async function GET(request: Request) {
  const session = await requireApiSession();
  if (!session) {
    return NextResponse.json({ error: "No autenticado." }, { status: 401 });
  }

  const clienteId = new URL(request.url).searchParams.get("clienteId");
  if (!clienteId) {
    return NextResponse.json({ error: "Falta clienteId." }, { status: 400 });
  }

  const cliente = await prisma.cliente.findFirst({
    where: { id: clienteId, empresaId: session.user.empresaId },
    select: {
      equipos: {
        select: { id: true, tipo: true, marca: true, modelo: true, numeroSerie: true },
      },
    },
  });
  if (!cliente) {
    return NextResponse.json({ error: "Cliente no encontrado." }, { status: 404 });
  }

  return NextResponse.json(cliente.equipos);
}

const crearEquipoSchema = z.object({
  clienteId: z.string().min(1),
  tipo: z.enum(EQUIPO_TIPOS),
  marca: z.string().trim().min(1),
  modelo: z.string().trim().min(1),
  numeroSerie: z.string().trim().optional(),
  observaciones: z.string().trim().optional(),
});

// POST /api/equipos — alta de un equipo nuevo para un cliente existente.
export async function POST(request: Request) {
  const session = await requireApiSession();
  if (!session) {
    return NextResponse.json({ error: "No autenticado." }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const parsed = crearEquipoSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Datos inválidos." }, { status: 400 });
  }

  const cliente = await prisma.cliente.findFirst({
    where: { id: parsed.data.clienteId, empresaId: session.user.empresaId },
    select: { id: true },
  });
  if (!cliente) {
    return NextResponse.json({ error: "Cliente no encontrado." }, { status: 404 });
  }

  const equipo = await prisma.equipo.create({
    data: {
      clienteId: parsed.data.clienteId,
      tipo: parsed.data.tipo,
      marca: parsed.data.marca,
      modelo: parsed.data.modelo,
      numeroSerie: parsed.data.numeroSerie || null,
      observaciones: parsed.data.observaciones || null,
    },
    select: { id: true, tipo: true, marca: true, modelo: true, numeroSerie: true },
  });

  return NextResponse.json(equipo, { status: 201 });
}
