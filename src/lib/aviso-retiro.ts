import type { EstadoReparacion } from "@prisma/client";
import { formatearMonto } from "@/lib/presupuesto";

// Textos del aviso de retiro que comparten el email (servidor) y el botón de
// WhatsApp del detalle. Cambian según cómo terminó la reparación.

type DatosAviso = {
  estado: EstadoReparacion;
  equipo: string;
  numero: string;
  monto: string | number | null;
};

export function introAvisoRetiro({ estado, equipo }: DatosAviso) {
  if (estado === "REPARADO") return `Tu ${equipo} ya está reparado y listo para retirar.`;
  if (estado === "NO_REPARABLE") {
    return `Revisamos tu ${equipo} y lamentablemente no pudo repararse. Ya podés pasar a retirarlo.`;
  }
  return `Tu ${equipo} ya está listo para que pases a retirarlo.`;
}

// El total solo aplica si se reparó (es el presupuesto que aprobó).
export function totalAvisoRetiro({ estado, monto }: DatosAviso) {
  return estado === "REPARADO" && monto ? `Total a abonar: ${formatearMonto(monto)}.` : null;
}

export function textoWhatsAppRetiro(datos: DatosAviso & { cliente: string; empresa: string }) {
  return [
    `Hola ${datos.cliente}. ${introAvisoRetiro(datos)}`,
    totalAvisoRetiro(datos),
    `Acordate de traer la orden de recepción ${datos.numero}.`,
    ``,
    datos.empresa,
  ]
    .filter((linea) => linea !== null)
    .join("\n");
}
