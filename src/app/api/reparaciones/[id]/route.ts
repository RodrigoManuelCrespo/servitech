import { NextResponse } from "next/server";
import { z } from "zod";
import { EstadoReparacion, type Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireApiSession } from "@/lib/session";
import { TRANSICIONES_VALIDAS } from "@/lib/estado";

const ESTADOS_VALIDOS = new Set<string>(Object.values(EstadoReparacion));

const detalleSelect = {
  id: true,
  estado: true,
  diagnostico: true,
  checklist: true,
  fechaIngreso: true,
  fechaEntrega: true,
  tecnicoAsignadoId: true,
  equipo: {
    select: {
      id: true,
      tipo: true,
      marca: true,
      modelo: true,
      numeroSerie: true,
      observaciones: true,
      cliente: { select: { id: true, nombre: true, telefono: true, email: true } },
    },
  },
  tecnicoAsignado: { select: { id: true, nombre: true } },
  historialEstados: {
    orderBy: { fecha: "asc" as const },
    select: {
      id: true,
      estadoAnterior: true,
      estadoNuevo: true,
      fecha: true,
      comentario: true,
      usuario: { select: { nombre: true } },
    },
  },
  documentosGenerados: {
    orderBy: { fechaEnvio: "desc" as const },
    select: {
      id: true,
      tipoDocumento: true,
      canalEnvio: true,
      estadoEnvio: true,
      fechaEnvio: true,
      url: true,
    },
  },
  fotos: { select: { id: true, url: true, descripcion: true } },
} satisfies Prisma.ReparacionSelect;

// GET /api/reparaciones/[id] — detalle completo de una reparación.
// TECNICO solo puede ver las suyas (mismo criterio que el filtro del
// listado en src/app/api/reparaciones/route.ts).
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await requireApiSession();
  if (!session) {
    return NextResponse.json({ error: "No autenticado." }, { status: 401 });
  }

  const { id } = await params;

  const reparacion = await prisma.reparacion.findFirst({
    where: { id, empresaId: session.user.empresaId },
    select: detalleSelect,
  });

  if (!reparacion) {
    return NextResponse.json({ error: "Reparación no encontrada." }, { status: 404 });
  }

  if (session.user.rol === "TECNICO" && reparacion.tecnicoAsignadoId !== session.user.id) {
    return NextResponse.json(
      { error: "No tenés acceso a esta reparación." },
      { status: 403 },
    );
  }

  return NextResponse.json(reparacion);
}

const patchSchema = z.object({
  estado: z.string().optional(),
  comentario: z.string().trim().optional(),
  diagnostico: z.string().trim().optional(),
  tecnicoAsignadoId: z.string().min(1).nullable().optional(),
});

// PATCH /api/reparaciones/[id] — cambia estado, diagnóstico y/o técnico
// asignado. ADMIN: cualquier reparación de su empresa. TECNICO: solo la
// suya, y no puede reasignar técnico.
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await requireApiSession();
  if (!session) {
    return NextResponse.json({ error: "No autenticado." }, { status: 401 });
  }

  const { id } = await params;

  const body = await request.json().catch(() => null);
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Datos inválidos." }, { status: 400 });
  }
  const { estado, comentario, diagnostico, tecnicoAsignadoId } = parsed.data;

  const actual = await prisma.reparacion.findFirst({
    where: { id, empresaId: session.user.empresaId },
    select: { id: true, estado: true, tecnicoAsignadoId: true },
  });
  if (!actual) {
    return NextResponse.json({ error: "Reparación no encontrada." }, { status: 404 });
  }

  if (session.user.rol === "TECNICO") {
    if (actual.tecnicoAsignadoId !== session.user.id) {
      return NextResponse.json(
        { error: "No tenés acceso a esta reparación." },
        { status: 403 },
      );
    }
    if (tecnicoAsignadoId !== undefined) {
      return NextResponse.json(
        { error: "Un técnico no puede reasignar la reparación." },
        { status: 403 },
      );
    }
  }

  if (estado !== undefined && !ESTADOS_VALIDOS.has(estado)) {
    return NextResponse.json({ error: "Estado inválido." }, { status: 400 });
  }

  const nuevoEstado = estado as EstadoReparacion | undefined;
  const cambiaEstado = nuevoEstado !== undefined && nuevoEstado !== actual.estado;

  if (cambiaEstado) {
    const permitidos = TRANSICIONES_VALIDAS[actual.estado];
    if (!permitidos.includes(nuevoEstado!)) {
      return NextResponse.json(
        { error: `No se puede pasar de ${actual.estado} a ${nuevoEstado}.` },
        { status: 400 },
      );
    }
  }

  if (tecnicoAsignadoId) {
    const tecnico = await prisma.usuario.findFirst({
      where: { id: tecnicoAsignadoId, empresaId: session.user.empresaId, rol: "TECNICO" },
      select: { id: true },
    });
    if (!tecnico) {
      return NextResponse.json({ error: "El técnico elegido no es válido." }, { status: 400 });
    }
  }

  const data: Prisma.ReparacionUpdateInput = {};
  if (diagnostico !== undefined) data.diagnostico = diagnostico || null;
  if (tecnicoAsignadoId !== undefined) {
    data.tecnicoAsignado = tecnicoAsignadoId
      ? { connect: { id: tecnicoAsignadoId } }
      : { disconnect: true };
  }
  if (cambiaEstado) {
    data.estado = nuevoEstado;
    if (nuevoEstado === "ENTREGADO") data.fechaEntrega = new Date();
  }

  await prisma.$transaction(async (tx) => {
    await tx.reparacion.update({ where: { id }, data });

    if (cambiaEstado) {
      await tx.historialEstado.create({
        data: {
          reparacionId: id,
          estadoAnterior: actual.estado,
          estadoNuevo: nuevoEstado!,
          usuarioId: session.user.id,
          comentario: comentario || null,
        },
      });
    }
  });

  return NextResponse.json({ ok: true });
}

const generarDocumentoSchema = z.object({
  canalEnvio: z.enum(["EMAIL", "WHATSAPP_MOCK"]).optional().default("WHATSAPP_MOCK"),
});

// POST /api/reparaciones/[id] — "Generar orden": crea un DocumentoGenerado
// simulado (no hay integración real de email/WhatsApp todavía, se registra
// como SIMULADO). Mismo criterio de acceso que el GET.
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
    select: { id: true, tecnicoAsignadoId: true },
  });
  if (!reparacion) {
    return NextResponse.json({ error: "Reparación no encontrada." }, { status: 404 });
  }
  if (session.user.rol === "TECNICO" && reparacion.tecnicoAsignadoId !== session.user.id) {
    return NextResponse.json(
      { error: "No tenés acceso a esta reparación." },
      { status: 403 },
    );
  }

  const body = await request.json().catch(() => ({}));
  const parsed = generarDocumentoSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Datos inválidos." }, { status: 400 });
  }

  const documento = await prisma.documentoGenerado.create({
    data: {
      reparacionId: id,
      tipoDocumento: "ORDEN_PDF",
      canalEnvio: parsed.data.canalEnvio,
      estadoEnvio: "SIMULADO",
    },
    select: {
      id: true,
      tipoDocumento: true,
      canalEnvio: true,
      estadoEnvio: true,
      fechaEnvio: true,
      url: true,
    },
  });

  return NextResponse.json(documento, { status: 201 });
}
