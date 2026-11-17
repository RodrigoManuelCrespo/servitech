import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireApiSession } from "@/lib/session";
import { MAX_FOTOS, decodificarFoto } from "@/lib/fotos";

const subirFotoSchema = z.object({ url: z.string() });

// POST /api/reparaciones/[id]/fotos — agrega una foto (data URI ya
// comprimida en el navegador). Admin o el técnico asignado; no se puede
// en una reparación entregada; máximo MAX_FOTOS por reparación.
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await requireApiSession();
  if (!session) {
    return NextResponse.json({ error: "No autenticado." }, { status: 401 });
  }
  const { id } = await params;

  const reparacion = await prisma.reparacion.findFirst({
    where: { id, empresaId: session.user.empresaId },
    select: { estado: true, tecnicoAsignadoId: true, _count: { select: { fotos: true } } },
  });
  if (!reparacion) {
    return NextResponse.json({ error: "Reparación no encontrada." }, { status: 404 });
  }
  if (session.user.rol === "TECNICO" && reparacion.tecnicoAsignadoId !== session.user.id) {
    return NextResponse.json({ error: "No tenés acceso a esta reparación." }, { status: 403 });
  }
  if (reparacion.estado === "ENTREGADO") {
    return NextResponse.json(
      { error: "La reparación ya fue entregada: no se pueden agregar fotos." },
      { status: 400 },
    );
  }
  if (reparacion._count.fotos >= MAX_FOTOS) {
    return NextResponse.json(
      { error: `Se pueden cargar hasta ${MAX_FOTOS} fotos por reparación.` },
      { status: 400 },
    );
  }

  const body = await request.json().catch(() => null);
  const parsed = subirFotoSchema.safeParse(body);
  if (!parsed.success || !decodificarFoto(parsed.data.url)) {
    return NextResponse.json(
      { error: "La foto debe ser JPG, PNG o WebP y no superar los 600 KB." },
      { status: 400 },
    );
  }

  const foto = await prisma.fotoReparacion.create({
    data: { reparacionId: id, url: parsed.data.url },
    select: { id: true, createdAt: true },
  });
  return NextResponse.json(foto, { status: 201 });
}
