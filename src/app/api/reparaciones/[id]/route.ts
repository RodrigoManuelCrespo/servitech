import { NextResponse } from "next/server";
import { z } from "zod";
import { EstadoReparacion, type Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireApiSession } from "@/lib/session";
import { ESTADOS_PRESUPUESTO_EDITABLE, transicionesPara } from "@/lib/estado";

const ESTADOS_VALIDOS = new Set<string>(Object.values(EstadoReparacion));

// Otro usuario cambió el estado entre que leímos la reparación y la
// actualizamos (doble click, dos pestañas, el cliente respondiendo a la vez).
class EstadoDesactualizadoError extends Error {}

function estadoDesactualizado() {
  return NextResponse.json(
    { error: "La reparación cambió de estado mientras tanto. Recargá la página." },
    { status: 409 },
  );
}

const detalleSelect = {
  id: true,
  estado: true,
  diagnostico: true,
  checklist: true,
  fechaIngreso: true,
  fechaEntrega: true,
  tecnicoAsignadoId: true,
  montoPresupuesto: true,
  mensajePresupuesto: true,
  linkToken: true,
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
  montoPresupuesto: z.coerce.number().nonnegative().nullable().optional(),
  mensajePresupuesto: z.string().trim().optional(),
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
  const { estado, comentario, diagnostico, tecnicoAsignadoId, montoPresupuesto, mensajePresupuesto } =
    parsed.data;

  const actual = await prisma.reparacion.findFirst({
    where: { id, empresaId: session.user.empresaId },
    select: { id: true, estado: true, tecnicoAsignadoId: true, diagnostico: true },
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
    if (montoPresupuesto !== undefined || mensajePresupuesto !== undefined) {
      return NextResponse.json(
        { error: "Un técnico no puede cargar el presupuesto." },
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
    const transicion = transicionesPara(actual.estado, session.user.rol).find(
      (t) => t.estado === nuevoEstado,
    );
    if (!transicion) {
      return NextResponse.json(
        { error: `No se puede pasar de ${actual.estado} a ${nuevoEstado}.` },
        { status: 400 },
      );
    }
    if (transicion.requiereMotivo && !comentario) {
      return NextResponse.json({ error: "Indicá el motivo del cambio." }, { status: 400 });
    }
    if (nuevoEstado === "DIAGNOSTICADO" && !(diagnostico ?? actual.diagnostico)?.trim()) {
      return NextResponse.json(
        { error: "Cargá el diagnóstico antes de marcarla como diagnosticada." },
        { status: 400 },
      );
    }
  }

  const tocaPresupuesto = montoPresupuesto !== undefined || mensajePresupuesto !== undefined;
  if (tocaPresupuesto && !ESTADOS_PRESUPUESTO_EDITABLE.includes(actual.estado)) {
    return NextResponse.json(
      { error: "El presupuesto solo se puede modificar antes de que el cliente responda." },
      { status: 400 },
    );
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
  if (montoPresupuesto !== undefined) data.montoPresupuesto = montoPresupuesto;
  if (mensajePresupuesto !== undefined) data.mensajePresupuesto = mensajePresupuesto || null;
  if (tecnicoAsignadoId !== undefined) {
    data.tecnicoAsignado = tecnicoAsignadoId
      ? { connect: { id: tecnicoAsignadoId } }
      : { disconnect: true };
  }
  try {
    await prisma.$transaction(async (tx) => {
      if (cambiaEstado) {
        // Condicionado al estado que validamos: si otro request lo cambió
        // en el medio, no se aplica nada.
        const { count } = await tx.reparacion.updateMany({
          where: { id, estado: actual.estado },
          data: {
            estado: nuevoEstado,
            ...(nuevoEstado === "ENTREGADO" && { fechaEntrega: new Date() }),
          },
        });
        if (count === 0) throw new EstadoDesactualizadoError();

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

      if (Object.keys(data).length > 0) {
        await tx.reparacion.update({ where: { id }, data });
      }
    });
  } catch (error) {
    if (error instanceof EstadoDesactualizadoError) return estadoDesactualizado();
    throw error;
  }

  return NextResponse.json({ ok: true });
}

const generarDocumentoSchema = z.object({
  tipoDocumento: z.enum(["ORDEN_PDF", "PRESUPUESTO"]).optional().default("ORDEN_PDF"),
  canalEnvio: z.enum(["EMAIL", "WHATSAPP_MOCK"]).optional().default("WHATSAPP_MOCK"),
});

// POST /api/reparaciones/[id] — "Generar orden" / "Enviar presupuesto": crea
// un DocumentoGenerado simulado (no hay integración real de email/WhatsApp
// todavía, se registra como SIMULADO). Mismo criterio de acceso que el GET,
// salvo "PRESUPUESTO" que además es admin-only (igual que cargarlo).
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
    select: {
      id: true,
      estado: true,
      tecnicoAsignadoId: true,
      montoPresupuesto: true,
      linkToken: true,
    },
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
  const { tipoDocumento, canalEnvio } = parsed.data;

  if (tipoDocumento === "PRESUPUESTO") {
    if (session.user.rol === "TECNICO") {
      return NextResponse.json(
        { error: "Un técnico no puede enviar el presupuesto." },
        { status: 403 },
      );
    }
    if (!ESTADOS_PRESUPUESTO_EDITABLE.includes(reparacion.estado)) {
      return NextResponse.json(
        { error: "El presupuesto solo se envía con la reparación diagnosticada o a autorizar." },
        { status: 400 },
      );
    }
    if (reparacion.montoPresupuesto === null || reparacion.montoPresupuesto.lte(0)) {
      return NextResponse.json(
        { error: "Cargá un monto mayor a cero antes de enviar el presupuesto." },
        { status: 400 },
      );
    }
  }

  const linkToken =
    tipoDocumento === "PRESUPUESTO" ? reparacion.linkToken ?? crypto.randomUUID() : undefined;
  // El primer envío pasa la reparación a "A autorizar": desde ahí le toca
  // responder al cliente. Un reenvío (ya en AUTORIZAR) no cambia el estado.
  const pasaAAutorizar = tipoDocumento === "PRESUPUESTO" && reparacion.estado === "DIAGNOSTICADO";

  let documento;
  try {
    documento = await prisma.$transaction(async (tx) => {
      if (pasaAAutorizar) {
        const { count } = await tx.reparacion.updateMany({
          where: { id, estado: "DIAGNOSTICADO" },
          data: { estado: "AUTORIZAR" },
        });
        if (count === 0) throw new EstadoDesactualizadoError();
        await tx.historialEstado.create({
          data: {
            reparacionId: id,
            estadoAnterior: "DIAGNOSTICADO",
            estadoNuevo: "AUTORIZAR",
            usuarioId: session.user.id,
            comentario: "Presupuesto enviado al cliente.",
          },
        });
      }
      if (linkToken && !reparacion.linkToken) {
        await tx.reparacion.update({ where: { id }, data: { linkToken } });
      }
      return tx.documentoGenerado.create({
        data: {
          reparacionId: id,
          tipoDocumento,
          canalEnvio,
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
    });
  } catch (error) {
    if (error instanceof EstadoDesactualizadoError) return estadoDesactualizado();
    throw error;
  }

  return NextResponse.json({ ...documento, linkToken }, { status: 201 });
}
