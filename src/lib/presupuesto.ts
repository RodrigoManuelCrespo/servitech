// Textos y links del presupuesto que comparten el email (servidor) y la
// pantalla del detalle (botón de WhatsApp).

// Se precarga al escribir el primer presupuesto: son los datos que la Ley
// 24.240 (art. 21) pide que tenga un presupuesto de reparación.
export const PLANTILLA_MENSAJE_PRESUPUESTO = [
  "Trabajo a realizar: ",
  "Plazo estimado: ",
  "Garantía: ",
  "Validez del presupuesto: 7 días",
].join("\n");

// Cómo respondió el cliente cuando la respuesta la registra el admin.
export const CANALES_RESPUESTA = {
  TELEFONO: { label: "Teléfono", frase: "por teléfono" },
  WHATSAPP: { label: "WhatsApp", frase: "por WhatsApp" },
  LOCAL: { label: "En el local", frase: "en el local" },
  EMAIL: { label: "Email", frase: "por email" },
} as const;
export type CanalRespuesta = keyof typeof CANALES_RESPUESTA;
export const CANALES_RESPUESTA_VALORES = Object.keys(CANALES_RESPUESTA) as [
  CanalRespuesta,
  ...CanalRespuesta[],
];

export function formatearMonto(monto: string | number) {
  return `$${Number(monto).toLocaleString("es-AR")}`;
}

export function linkSeguimiento(origen: string, token: string) {
  return `${origen}/seguimiento/${token}`;
}

// WhatsApp pide el número en formato internacional sin "+" ni espacios.
// Los teléfonos se cargan como en Argentina (ej. 341 555-0101): a los de 10
// dígitos se les agrega 549 (país + celular).
export function telefonoWhatsApp(telefono: string): string | null {
  const digitos = telefono.replace(/\D/g, "").replace(/^0+/, "");
  if (digitos.length === 10) return `549${digitos}`;
  if (digitos.startsWith("54") && digitos.length >= 12) return digitos;
  return digitos.length >= 8 ? digitos : null;
}

export function linkWhatsApp(telefono: string, texto: string): string | null {
  const numero = telefonoWhatsApp(telefono);
  return numero ? `https://wa.me/${numero}?text=${encodeURIComponent(texto)}` : null;
}

export function textoWhatsAppPresupuesto(datos: {
  cliente: string;
  equipo: string;
  monto: string | number;
  link: string;
  empresa: string;
}) {
  return [
    `Hola ${datos.cliente}, ya revisamos tu ${datos.equipo}.`,
    `El presupuesto es de ${formatearMonto(datos.monto)}.`,
    `Podés verlo y aprobarlo o rechazarlo acá: ${datos.link}`,
    ``,
    datos.empresa,
  ].join("\n");
}
