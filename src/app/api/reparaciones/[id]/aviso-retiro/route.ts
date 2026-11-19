import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireApiAdmin } from "@/lib/session";
import { ESTADOS_PARA_RETIRAR } from "@/lib/estado";
import { enviarAvisoRetiroPorEmail } from "@/lib/aviso-retiro-email";

const avisoSchema = z.object({
  // EMAIL: se envía el aviso. WHATSAPP: el admin abrió WhatsApp para
  // avisarle; solo se registra, no podemos confirmar que lo haya enviado.
  canal: z.enum(["EMAIL", "WHATSAPP"]),
});

// POST /api/reparaciones/[id]/aviso-retiro — le avisa al cliente que puede
// retirar el equipo (reparado, no reparable o con el presupuesto
// rechazado). Lo dispara el admin a mano: no es automático, para que
// confirme antes que el equipo está listo. Solo ADMIN.
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

  const body = await request.json().catch(() => null);
  const parsed = avisoSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Datos inválidos." }, { status: 400 });
  }

  const reparacion = await prisma.reparacion.findFirst({
    where: { id, empresaId: session.user.empresaId },
    select: { estado: true },
  });
  if (!reparacion) {
    return NextResponse.json({ error: "Reparación no encontrada." }, { status: 404 });
  }
  if (!ESTADOS_PARA_RETIRAR.includes(reparacion.estado)) {
    return NextResponse.json(
      { error: "El aviso de retiro se envía cuando el equipo está listo para retirar." },
      { status: 400 },
    );
  }

  if (parsed.data.canal === "WHATSAPP") {
    await prisma.documentoGenerado.create({
      data: {
        reparacionId: id,
        tipoDocumento: "AVISO_RETIRO",
        canalEnvio: "WHATSAPP_MOCK",
        estadoEnvio: "ENVIADO",
      },
    });
    return NextResponse.json({ ok: true }, { status: 201 });
  }

  const email = await enviarAvisoRetiroPorEmail(id, session.user.empresaId);
  return NextResponse.json({ email }, { status: 201 });
}
