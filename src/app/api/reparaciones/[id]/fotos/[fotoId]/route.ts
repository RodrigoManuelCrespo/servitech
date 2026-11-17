import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireApiSession } from "@/lib/session";
import { decodificarFoto } from "@/lib/fotos";

type Params = { params: Promise<{ id: string; fotoId: string }> };

// Busca la foto validando acceso: empresa de la sesión y, si es técnico,
// que la reparación sea suya.
async function buscarFoto({ params }: Params) {
  const session = await requireApiSession();
  if (!session) {
    return { error: NextResponse.json({ error: "No autenticado." }, { status: 401 }) };
  }
  const { id, fotoId } = await params;

  const foto = await prisma.fotoReparacion.findFirst({
    where: { id: fotoId, reparacionId: id, reparacion: { empresaId: session.user.empresaId } },
    select: { id: true, url: true, reparacion: { select: { estado: true, tecnicoAsignadoId: true } } },
  });
  if (!foto) {
    return { error: NextResponse.json({ error: "Foto no encontrada." }, { status: 404 }) };
  }
  if (session.user.rol === "TECNICO" && foto.reparacion.tecnicoAsignadoId !== session.user.id) {
    return {
      error: NextResponse.json({ error: "No tenés acceso a esta reparación." }, { status: 403 }),
    };
  }
  return { foto };
}

// GET — la imagen en sí. Se sirve como archivo (no dentro del JSON del
// detalle) para que la pantalla cargue liviana y el navegador la cachee:
// una foto nunca cambia, solo se agrega o se borra.
export async function GET(_request: Request, ctx: Params) {
  const { foto, error } = await buscarFoto(ctx);
  if (error) return error;

  const imagen = decodificarFoto(foto.url);
  if (!imagen) {
    return NextResponse.json({ error: "Foto inválida." }, { status: 500 });
  }
  return new NextResponse(new Uint8Array(imagen.datos), {
    headers: {
      "Content-Type": imagen.tipo,
      "Cache-Control": "private, max-age=31536000, immutable",
    },
  });
}

// DELETE — admin o técnico asignado, mientras la reparación no esté entregada.
export async function DELETE(_request: Request, ctx: Params) {
  const { foto, error } = await buscarFoto(ctx);
  if (error) return error;

  if (foto.reparacion.estado === "ENTREGADO") {
    return NextResponse.json(
      { error: "La reparación ya fue entregada: no se pueden borrar fotos." },
      { status: 400 },
    );
  }
  await prisma.fotoReparacion.delete({ where: { id: foto.id } });
  return NextResponse.json({ ok: true });
}
