import { NextResponse } from "next/server";
import { z } from "zod";
import { EstadoReparacion, type Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireApiAdmin, requireApiSession } from "@/lib/session";
import { presupuestoEditable, transicionesPara } from "@/lib/estado";
import { CANALES_RESPUESTA, CANALES_RESPUESTA_VALORES } from "@/lib/presupuesto";
import { enviarPresupuestoPorEmail } from "@/lib/presupuesto-email";

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
  fallaReportada: true,
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
  empresa: { select: { nombre: true } },
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
  // Solo ids: cada imagen se baja aparte de /api/reparaciones/[id]/fotos/[fotoId].
  fotos: { orderBy: { createdAt: "asc" as const }, select: { id: true } },
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
  // Cuando el admin registra la respuesta del cliente (A autorizar →
  // Aprobado/Rechazado): por dónde respondió.
  canalRespuesta: z.enum(CANALES_RESPUESTA_VALORES).optional(),
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
  const {
    estado,
    comentario,
    diagnostico,
    tecnicoAsignadoId,
    montoPresupuesto,
    mensajePresupuesto,
    canalRespuesta,
  } = parsed.data;

  const actual = await prisma.reparacion.findFirst({
    where: { id, empresaId: session.user.empresaId },
    select: { id: true, estado: true, tecnicoAsignadoId: true, diagnostico: true, linkToken: true },
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
  // El admin registra una respuesta que el cliente dio por fuera del link.
  const respuestaDelCliente =
    cambiaEstado &&
    actual.estado === "AUTORIZAR" &&
    (nuevoEstado === "APROBADO" || nuevoEstado === "RECHAZADO");

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
    if (respuestaDelCliente && !canalRespuesta) {
      return NextResponse.json({ error: "Indicá cómo respondió el cliente." }, { status: 400 });
    }
    if (nuevoEstado === "DIAGNOSTICADO" && !(diagnostico ?? actual.diagnostico)?.trim()) {
      return NextResponse.json(
        { error: "Cargá el diagnóstico antes de marcarla como diagnosticada." },
        { status: 400 },
      );
    }
  }

  const tocaPresupuesto = montoPresupuesto !== undefined || mensajePresupuesto !== undefined;
  if (tocaPresupuesto && !presupuestoEditable(actual.estado, !!actual.linkToken)) {
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
            comentario: respuestaDelCliente
              ? [`Respondió ${CANALES_RESPUESTA[canalRespuesta!].frase}.`, comentario].filter(Boolean).join(" ")
              : comentario || null,
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

const enviarPresupuestoSchema = z.object({
  // La orden de recepción se envía sola al registrar la recepción
  // (lib/orden-recepcion); por acá solo pasa el presupuesto.
  tipoDocumento: z.literal("PRESUPUESTO"),
  // EMAIL: el envío del presupuesto (pasa a A autorizar si corresponde y le
  // manda el email si tiene). WHATSAPP_MOCK: el admin abrió WhatsApp para
  // mandárselo; solo se registra, no podemos confirmar que lo haya enviado.
  canalEnvio: z.enum(["EMAIL", "WHATSAPP_MOCK"]).optional().default("EMAIL"),
});

// POST /api/reparaciones/[id] — envía el presupuesto al cliente y lo
// registra en DocumentoGenerado. Solo ADMIN: la comunicación con el cliente
// la maneja el mostrador, no el técnico.
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireApiAdmin();
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }
  const session = auth.session;

  const { id } = await params;

  const reparacion = await prisma.reparacion.findFirst({
    where: { id, empresaId: session.user.empresaId },
    select: {
      id: true,
      estado: true,
      montoPresupuesto: true,
      linkToken: true,
    },
  });
  if (!reparacion) {
    return NextResponse.json({ error: "Reparación no encontrada." }, { status: 404 });
  }

  const body = await request.json().catch(() => ({}));
  const parsed = enviarPresupuestoSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Datos inválidos." }, { status: 400 });
  }
  const { canalEnvio } = parsed.data;

  if (canalEnvio === "WHATSAPP_MOCK") {
    if (reparacion.estado !== "AUTORIZAR") {
      return NextResponse.json(
        { error: "El presupuesto se comparte por WhatsApp una vez enviado." },
        { status: 400 },
      );
    }
    await prisma.documentoGenerado.create({
      data: {
        reparacionId: id,
        tipoDocumento: "PRESUPUESTO",
        canalEnvio: "WHATSAPP_MOCK",
        estadoEnvio: "ENVIADO",
      },
    });
    return NextResponse.json({ ok: true }, { status: 201 });
  }

  if (!presupuestoEditable(reparacion.estado, !!reparacion.linkToken)) {
    return NextResponse.json(
      { error: "El presupuesto solo se envía con la reparación diagnosticada, a autorizar o con un presupuesto rechazado." },
      { status: 400 },
    );
  }
  if (reparacion.montoPresupuesto === null || reparacion.montoPresupuesto.lte(0)) {
    return NextResponse.json(
      { error: "Cargá un monto mayor a cero antes de enviar el presupuesto." },
      { status: 400 },
    );
  }

  const linkToken = reparacion.linkToken ?? crypto.randomUUID();
  // El primer envío (o uno nuevo después de un rechazo) pasa la reparación a
  // "A autorizar": desde ahí le toca responder al cliente. Un reenvío (ya en
  // AUTORIZAR) no cambia el estado.
  const estadoPrevio = reparacion.estado;
  const pasaAAutorizar = estadoPrevio === "DIAGNOSTICADO" || estadoPrevio === "RECHAZADO";

  try {
    await prisma.$transaction(async (tx) => {
      if (pasaAAutorizar) {
        const { count } = await tx.reparacion.updateMany({
          where: { id, estado: estadoPrevio },
          data: { estado: "AUTORIZAR" },
        });
        if (count === 0) throw new EstadoDesactualizadoError();
        await tx.historialEstado.create({
          data: {
            reparacionId: id,
            estadoAnterior: estadoPrevio,
            estadoNuevo: "AUTORIZAR",
            usuarioId: session.user.id,
            comentario:
              estadoPrevio === "RECHAZADO"
                ? "Nuevo presupuesto enviado al cliente."
                : "Presupuesto enviado al cliente.",
          },
        });
      }
      if (!reparacion.linkToken) {
        await tx.reparacion.update({ where: { id }, data: { linkToken } });
      }
    });
  } catch (error) {
    if (error instanceof EstadoDesactualizadoError) return estadoDesactualizado();
    throw error;
  }

  // Fuera de la transacción: si el email falla, el presupuesto igual quedó
  // enviado (A autorizar) y el admin puede reenviarlo o mandarlo por WhatsApp.
  const origen = new URL(request.url).origin;
  const email = await enviarPresupuestoPorEmail(
    id,
    session.user.empresaId,
    origen,
    estadoPrevio === "RECHAZADO",
  );

  return NextResponse.json({ linkToken, email }, { status: 201 });
}
