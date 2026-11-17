import { NextResponse } from "next/server";
import { z } from "zod";
import { EstadoReparacion, type Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireApiAdmin, requireApiSession } from "@/lib/session";
import { checklistSchema } from "@/lib/checklist";
import { MAX_FOTOS, decodificarFoto } from "@/lib/fotos";
import { enviarOrdenRecepcion } from "@/lib/orden-recepcion";

const ESTADOS_VALIDOS = new Set<string>(Object.values(EstadoReparacion));

// GET /api/reparaciones?estado=&tecnicoId=&cliente= — listado con filtros.
// Un TECNICO solo ve las suyas: se ignora cualquier tecnicoId que venga en
// el query para ese rol, para que no pueda ver las de otro cambiando la URL.
export async function GET(request: Request) {
  const session = await requireApiSession();
  if (!session) {
    return NextResponse.json({ error: "No autenticado." }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const estado = searchParams.get("estado");
  const tecnicoIdParam = searchParams.get("tecnicoId");
  const clienteParam = searchParams.get("cliente")?.trim();

  const where: Prisma.ReparacionWhereInput = {
    empresaId: session.user.empresaId,
  };

  if (estado && ESTADOS_VALIDOS.has(estado)) {
    where.estado = estado as EstadoReparacion;
  }

  if (session.user.rol === "TECNICO") {
    where.tecnicoAsignadoId = session.user.id;
  } else if (tecnicoIdParam) {
    where.tecnicoAsignadoId = tecnicoIdParam;
  }

  if (clienteParam) {
    where.equipo = { cliente: { nombre: { contains: clienteParam, mode: "insensitive" } } };
  }

  const reparaciones = await prisma.reparacion.findMany({
    where,
    select: {
      id: true,
      estado: true,
      fechaIngreso: true,
      fechaEntrega: true,
      equipo: {
        select: {
          marca: true,
          modelo: true,
          cliente: { select: { nombre: true } },
        },
      },
      tecnicoAsignado: { select: { nombre: true } },
    },
    orderBy: { fechaIngreso: "asc" },
  });

  return NextResponse.json(reparaciones);
}

const crearRecepcionSchema = z.object({
  equipoId: z.string().min(1),
  fallaReportada: z
    .string({ error: "Describí la falla que reporta el cliente." })
    .trim()
    .min(3, "Describí la falla que reporta el cliente."),
  checklist: checklistSchema,
  tecnicoAsignadoId: z.string().min(1).optional(),
  diagnostico: z.string().trim().optional(),
  // Fotos iniciales, ya comprimidas en el navegador (data URI).
  fotos: z
    .array(z.string())
    .max(MAX_FOTOS, `Se pueden cargar hasta ${MAX_FOTOS} fotos por reparación.`)
    .optional(),
});

// POST /api/reparaciones — recepción de un equipo: crea la Reparacion
// (estado RECIBIDO) y su primer HistorialEstado en una sola transacción.
// Solo ADMIN hace la recepción — el Técnico no.
export async function POST(request: Request) {
  const auth = await requireApiAdmin();
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }
  const session = auth.session;

  const body = await request.json().catch(() => null);
  const parsed = crearRecepcionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Datos inválidos." },
      { status: 400 },
    );
  }

  const empresaId = session.user.empresaId;
  const { equipoId, fallaReportada, checklist, tecnicoAsignadoId, diagnostico, fotos = [] } =
    parsed.data;

  if (fotos.some((foto) => !decodificarFoto(foto))) {
    return NextResponse.json(
      { error: "Cada foto debe ser JPG, PNG o WebP y no superar los 600 KB." },
      { status: 400 },
    );
  }

  const equipo = await prisma.equipo.findFirst({
    where: { id: equipoId, cliente: { empresaId } },
    select: { id: true },
  });
  if (!equipo) {
    return NextResponse.json({ error: "El equipo no pertenece a tu empresa." }, { status: 403 });
  }

  if (tecnicoAsignadoId) {
    const tecnico = await prisma.usuario.findFirst({
      where: { id: tecnicoAsignadoId, empresaId, rol: "TECNICO" },
      select: { id: true },
    });
    if (!tecnico) {
      return NextResponse.json({ error: "El técnico elegido no es válido." }, { status: 400 });
    }
  }

  const reparacion = await prisma.$transaction(async (tx) => {
    const nueva = await tx.reparacion.create({
      data: {
        empresaId,
        equipoId,
        estado: "RECIBIDO",
        fallaReportada,
        checklist,
        tecnicoAsignadoId,
        diagnostico: diagnostico || null,
        // En la misma transacción: no queda una reparación a medio cargar.
        fotos: { create: fotos.map((url) => ({ url })) },
      },
    });

    await tx.historialEstado.create({
      data: {
        reparacionId: nueva.id,
        estadoAnterior: null,
        estadoNuevo: "RECIBIDO",
        usuarioId: session.user.id,
      },
    });

    return nueva;
  });

  // Fuera de la transacción: la recepción ya quedó registrada aunque el
  // email falle. El wizard usa el resultado para avisarle al admin.
  const email = await enviarOrdenRecepcion(reparacion.id, empresaId);

  return NextResponse.json({ id: reparacion.id, email }, { status: 201 });
}
