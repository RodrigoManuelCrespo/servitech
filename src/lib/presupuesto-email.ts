import "server-only";
import { prisma } from "@/lib/prisma";
import { enviarEmail, escaparHtml } from "@/lib/email";
import { formatearMonto, linkSeguimiento } from "@/lib/presupuesto";

export type EnvioPresupuesto = "ENVIADO" | "ERROR" | "SIN_EMAIL";

// Le manda el presupuesto al cliente por email, con el link para aprobarlo
// o rechazarlo, y registra el resultado en DocumentoGenerado. No incluye el
// diagnóstico (es interno). Si el cliente no tiene email no envía nada: el
// admin se lo manda por WhatsApp desde el detalle.
export async function enviarPresupuestoPorEmail(
  reparacionId: string,
  empresaId: string,
  origen: string,
  nuevo: boolean,
): Promise<EnvioPresupuesto> {
  const [reparacion, empresa] = await Promise.all([
    prisma.reparacion.findFirst({
      where: { id: reparacionId, empresaId },
      select: {
        montoPresupuesto: true,
        mensajePresupuesto: true,
        linkToken: true,
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
  if (!reparacion || !empresa || !reparacion.linkToken || !reparacion.montoPresupuesto) {
    return "ERROR";
  }
  const { cliente } = reparacion.equipo;
  if (!cliente.email) return "SIN_EMAIL";

  const equipo = `${reparacion.equipo.tipo} ${reparacion.equipo.marca} ${reparacion.equipo.modelo}`;
  const monto = formatearMonto(reparacion.montoPresupuesto.toString());
  const link = linkSeguimiento(origen, reparacion.linkToken);
  const contacto = [empresa.telefono, empresa.email].filter(Boolean).join(" · ");
  const intro = nuevo
    ? `Te enviamos un nuevo presupuesto para tu ${equipo}.`
    : `Ya revisamos tu ${equipo}. Este es el presupuesto de la reparación.`;
  const mensaje = reparacion.mensajePresupuesto?.trim();

  const resultado = await enviarEmail({
    to: cliente.email,
    fromName: empresa.nombre,
    replyTo: empresa.email ?? undefined,
    subject: `${nuevo ? "Nuevo presupuesto" : "Presupuesto"} para tu ${equipo} — ${empresa.nombre}`,
    text: [
      `Hola ${cliente.nombre}:`,
      ``,
      intro,
      ``,
      `Presupuesto: ${monto}`,
      ...(mensaje ? [``, mensaje] : []),
      ``,
      `Para aprobarlo o rechazarlo, entrá acá: ${link}`,
      `Si tenés dudas, respondé este email o comunicate con nosotros.`,
      ``,
      empresa.nombre,
      contacto,
    ].join("\n"),
    html: `
      <div style="font-family:Arial,sans-serif;font-size:14px;color:#111827;line-height:1.5">
        <p>Hola ${escaparHtml(cliente.nombre)}:</p>
        <p>${escaparHtml(intro)}</p>
        <p style="font-size:22px;font-weight:bold;margin:16px 0">${monto}</p>
        ${mensaje ? `<p style="color:#374151">${escaparHtml(mensaje).replace(/\n/g, "<br>")}</p>` : ""}
        <p style="margin:24px 0">
          <a href="${escaparHtml(link)}" style="background:#2563eb;color:#ffffff;padding:10px 18px;border-radius:8px;text-decoration:none;font-weight:bold">Ver y responder el presupuesto</a>
        </p>
        <p style="color:#6b7280">Si tenés dudas, respondé este email o comunicate con nosotros.</p>
        <p style="color:#6b7280">${escaparHtml(empresa.nombre)}<br>${escaparHtml(contacto)}</p>
      </div>`,
  });

  const estado = resultado.ok ? "ENVIADO" : "ERROR";
  await prisma.documentoGenerado.create({
    data: { reparacionId, tipoDocumento: "PRESUPUESTO", canalEnvio: "EMAIL", estadoEnvio: estado },
  });
  return estado;
}
