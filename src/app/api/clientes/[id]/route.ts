import { requireApiAdmin } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { z } from "zod";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  // Clientes es solo del admin: el técnico trabaja sobre sus reparaciones.
  const auth = await requireApiAdmin();
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }
  const session = auth.session;

  const { id } = await params;

  const cliente = await prisma.cliente.findFirst({
    where: { id, empresaId: session.user.empresaId },
    include: {
      equipos: {
        include: {
          reparaciones: {
            orderBy: { fechaIngreso: "desc" },
            select: { id: true, estado: true, fechaIngreso: true, fechaEntrega: true },
          },
        },
      },
    },
  });

  if (!cliente) {
    return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  }

  return NextResponse.json(cliente);
}

const clienteSchema = z.object({
  nombre: z.string().min(1, "El nombre no puede estar vacío").optional(),
  telefono: z.string().min(1, "El teléfono no puede estar vacío").optional(),
  email: z.string().email("Email inválido").nullable().optional(),
});

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  // Clientes es solo del admin: el técnico trabaja sobre sus reparaciones.
  const auth = await requireApiAdmin();
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }
  const session = auth.session;

  const { id } = await params;
  const empresaId = session.user.empresaId;

  const existe = await prisma.cliente.findFirst({ where: { id, empresaId } });
  if (!existe) {
    return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  }

  const body = await req.json();
  const parsed = clienteSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const cliente = await prisma.cliente.update({
    where: { id },
    data: parsed.data,
  });

  return NextResponse.json(cliente);
}
