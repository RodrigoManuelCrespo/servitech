import "server-only";
import { renderToBuffer } from "@react-pdf/renderer";
import { prisma } from "@/lib/prisma";
import { OrdenRecepcionPdf } from "@/components/pdf/orden-recepcion";
import type { ChecklistRecepcion } from "@/lib/checklist";
import { enviarEmail, escaparHtml } from "@/lib/email";

async function cargarDatos(reparacionId: string, empresaId: string) {
  const [reparacion, empresa] = await Promise.all([
    prisma.reparacion.findFirst({
      where: { id: reparacionId, empresaId },
      select: {
        id: true,
        fallaReportada: true,
        checklist: true,
        fechaIngreso: true,
        equipo: {
          select: {
            tipo: true,
            marca: true,
            modelo: true,
            numeroSerie: true,
            observaciones: true,
            cliente: { select: { nombre: true, telefono: true, email: true } },
          },
        },
      },
    }),
    prisma.empresa.findUnique({
      where: { id: empresaId },
      select: { nombre: true, telefono: true, email: true, logoUrl: true },
    }),
  ]);
  if (!reparacion || !empresa) return null;
  return { reparacion, empresa };
}

function renderizar({ reparacion, empresa }: NonNullable<Awaited<ReturnType<typeof cargarDatos>>>) {
  return renderToBuffer(
    <OrdenRecepcionPdf
      reparacion={{ ...reparacion, checklist: reparacion.checklist as ChecklistRecepcion | null }}
      empresa={empresa}
    />,
  );
}

// Genera la orden de recepción en PDF. Devuelve null si la reparación no
// existe o no es de la empresa.
export async function generarOrdenRecepcion(
  reparacionId: string,
  empresaId: string,
): Promise<Buffer | null> {
  const datos = await cargarDatos(reparacionId, empresaId);
  return datos ? renderizar(datos) : null;
}

export type EnvioOrden = "ENVIADO" | "ERROR" | "SIN_EMAIL";

// Le manda la orden de recepción al cliente por email, con el PDF adjunto,
// y registra el resultado en DocumentoGenerado. Si el cliente no tiene
// email no envía nada: el admin la imprime en el mostrador.
export async function enviarOrdenRecepcion(
  reparacionId: string,
  empresaId: string,
): Promise<EnvioOrden> {
  const datos = await cargarDatos(reparacionId, empresaId);
  if (!datos) return "ERROR";
  const { reparacion, empresa } = datos;
  const { cliente } = reparacion.equipo;
  if (!cliente.email) return "SIN_EMAIL";

  const numero = `r${reparacion.id.slice(-4)}`;
  const equipo = `${reparacion.equipo.tipo} ${reparacion.equipo.marca} ${reparacion.equipo.modelo}`;
  const contacto = [empresa.telefono, empresa.email].filter(Boolean).join(" · ");

  let resultado;
  try {
    const pdf = await renderizar(datos);
    resultado = await enviarEmail({
      to: cliente.email,
      fromName: empresa.nombre,
      replyTo: empresa.email ?? undefined,
      subject: `Orden de recepción ${numero} — ${empresa.nombre}`,
      text: [
        `Hola ${cliente.nombre}:`,
        ``,
        `Recibimos tu ${equipo}. Te adjuntamos la orden de recepción ${numero}.`,
        `Conservala: identifica a tu equipo y la vas a necesitar para retirarlo.`,
        ``,
        `Te vamos a avisar cuando tengamos el diagnóstico.`,
        ``,
        empresa.nombre,
        contacto,
      ].join("\n"),
      html: `
        <div style="font-family:Arial,sans-serif;font-size:14px;color:#111827;line-height:1.5">
          <p>Hola ${escaparHtml(cliente.nombre)}:</p>
          <p>Recibimos tu <strong>${escaparHtml(equipo)}</strong>. Te adjuntamos la
          <strong>orden de recepción ${numero}</strong>.</p>
          <p>Conservala: identifica a tu equipo y la vas a necesitar para retirarlo.</p>
          <p>Te vamos a avisar cuando tengamos el diagnóstico.</p>
          <p style="color:#6b7280">${escaparHtml(empresa.nombre)}<br>${escaparHtml(contacto)}</p>
        </div>`,
      attachments: [
        { filename: `orden-recepcion-${numero}.pdf`, content: pdf, contentType: "application/pdf" },
      ],
    });
  } catch (error) {
    console.error("[orden] Error al generar el PDF:", error);
    resultado = { ok: false as const };
  }

  const estado = resultado.ok ? "ENVIADO" : "ERROR";
  await prisma.documentoGenerado.create({
    data: { reparacionId, tipoDocumento: "ORDEN_PDF", canalEnvio: "EMAIL", estadoEnvio: estado },
  });
  return estado;
}
