import { requireApiAdmin } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

export async function GET(req: NextRequest) {
  // Clientes es solo del admin: el técnico trabaja sobre sus reparaciones.
  const auth = await requireApiAdmin();
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }
  const session = auth.session;

  const empresaId = session.user.empresaId;
  const search = req.nextUrl.searchParams.get("search")?.trim() ?? "";

  const clientes = await prisma.cliente.findMany({
    where: {
      empresaId,
      ...(search
        ? {
            OR: [
              { nombre: { contains: search, mode: "insensitive" } },
              { telefono: { contains: search, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    orderBy: { nombre: "asc" },
    include: { _count: { select: { equipos: true } } },
  });

  const result = clientes.map((c) => ({
    id: c.id,
    nombre: c.nombre,
    telefono: c.telefono,
    email: c.email,
    cantidadEquipos: c._count.equipos,
  }));

  return NextResponse.json(result);
}

const crearClienteSchema = z.object({
  nombre: z.string().trim().min(1, "El nombre no puede estar vacío"),
  telefono: z.string().trim().min(1, "El teléfono no puede estar vacío"),
  email: z.string().email("Email inválido").nullable().optional(),
});

// POST /api/clientes — alta de un cliente nuevo (pedido por el ticket de
// Nueva Recepción, faltaba en este módulo).
export async function POST(req: NextRequest) {
  // Clientes es solo del admin: el técnico trabaja sobre sus reparaciones.
  const auth = await requireApiAdmin();
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }
  const session = auth.session;

  const body = await req.json().catch(() => null);
  const parsed = crearClienteSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const cliente = await prisma.cliente.create({
    data: {
      nombre: parsed.data.nombre,
      telefono: parsed.data.telefono,
      email: parsed.data.email || null,
      empresaId: session.user.empresaId,
    },
    select: { id: true, nombre: true, telefono: true, email: true },
  });

  return NextResponse.json(cliente, { status: 201 });
}
