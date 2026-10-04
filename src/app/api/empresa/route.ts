import { requireApiAdmin } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { z } from "zod";

export async function GET() {
  const auth = await requireApiAdmin();
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }
  const session = auth.session;

  const empresa = await prisma.empresa.findUnique({
    where: { id: session.user.empresaId },
    select: { id: true, nombre: true, telefono: true, email: true, logoUrl: true },
  });

  if (!empresa) {
    return NextResponse.json({ error: "Empresa no encontrada" }, { status: 404 });
  }
  return NextResponse.json(empresa);
}

const empresaSchema = z.object({
  nombre: z.string().min(1, "El nombre no puede estar vacío").optional(),
  telefono: z.string().nullable().optional(),
  email: z.string().email("Email inválido").nullable().optional(),
});

export async function PATCH(req: Request) {
  const auth = await requireApiAdmin();
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }
  const session = auth.session;

  const body = await req.json();
  const parsed = empresaSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const empresa = await prisma.empresa.update({
    where: { id: session.user.empresaId },
    data: parsed.data,
  });

  return NextResponse.json(empresa);
}
