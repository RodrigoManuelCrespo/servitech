import "server-only";
import { prisma } from "@/lib/prisma";
import { enviarEmail, escaparHtml } from "@/lib/email";
import { introAvisoRetiro, totalAvisoRetiro } from "@/lib/aviso-retiro";

export type EnvioAvisoRetiro = "ENVIADO" | "ERROR" | "SIN_EMAIL";

// Le avisa al cliente por email que puede retirar el equipo y registra el
// resultado en DocumentoGenerado (AVISO_RETIRO). Si no tiene email no envía
// nada: el admin le avisa por WhatsApp desde el detalle.
export async function enviarAvisoRetiroPorEmail(
  reparacionId: string,
  empresaId: string,
): Promise<EnvioAvisoRetiro> {
  const [reparacion, empresa] = await Promise.all([
    prisma.reparacion.findFirst({
      where: { id: reparacionId, empresaId },
      select: {
        id: true,
        estado: true,
        montoPresupuesto: true,
        equipo: {
          select: {
            tipo: true,
            marca: true,
            modelo: true,
            cliente: { select: { nombre: true, email: true } },
          },
        },
      },
    }),
    prisma.empresa.findUnique({
      where: { id: empresaId },
      select: { nombre: true, telefono: true, email: true },
    }),
  ]);
  if (!reparacion || !empresa) return "ERROR";
  const { cliente } = reparacion.equipo;
  if (!cliente.email) return "SIN_EMAIL";

  const datos = {
    estado: reparacion.estado,
    equipo: `${reparacion.equipo.tipo} ${reparacion.equipo.marca} ${reparacion.equipo.modelo}`,
    numero: `r${reparacion.id.slice(-4)}`,
    monto: reparacion.montoPresupuesto?.toString() ?? null,
  };
  const intro = introAvisoRetiro(datos);
  const total = totalAvisoRetiro(datos);
  const contacto = [empresa.telefono, empresa.email].filter(Boolean).join(" · ");

  const resultado = await enviarEmail({
    to: cliente.email,
    fromName: empresa.nombre,
    replyTo: empresa.email ?? undefined,
    subject: `Tu ${datos.equipo} está listo para retirar — ${empresa.nombre}`,
    text: [
      `Hola ${cliente.nombre}:`,
      ``,
      intro,
      ...(total ? [total] : []),
      ``,
      `Acordate de traer la orden de recepción ${datos.numero}.`,
      `Si tenés dudas, respondé este email o comunicate con nosotros.`,
      ``,
      empresa.nombre,
      contacto,
    ].join("\n"),
    html: `
      <div style="font-family:Arial,sans-serif;font-size:14px;color:#111827;line-height:1.5">
        <p>Hola ${escaparHtml(cliente.nombre)}:</p>
        <p>${escaparHtml(intro)}</p>
        ${total ? `<p style="font-size:18px;font-weight:bold">${escaparHtml(total)}</p>` : ""}
        <p>Acordate de traer la <strong>orden de recepción ${datos.numero}</strong>.</p>
        <p style="color:#6b7280">Si tenés dudas, respondé este email o comunicate con nosotros.</p>
        <p style="color:#6b7280">${escaparHtml(empresa.nombre)}<br>${escaparHtml(contacto)}</p>
      </div>`,
  });

  const estado = resultado.ok ? "ENVIADO" : "ERROR";
  await prisma.documentoGenerado.create({
    data: { reparacionId, tipoDocumento: "AVISO_RETIRO", canalEnvio: "EMAIL", estadoEnvio: estado },
  });
  return estado;
}
