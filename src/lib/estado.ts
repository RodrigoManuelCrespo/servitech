import type { EstadoReparacion, Rol } from "@prisma/client";

// Orden del flujo: también define el orden de las tarjetas del Dashboard
// y de las opciones de los filtros.
export const ESTADOS: EstadoReparacion[] = [
  "RECIBIDO",
  "DIAGNOSTICADO",
  "AUTORIZAR",
  "APROBADO",
  "REPARADO",
  "NO_REPARABLE",
  "RECHAZADO",
  "ENTREGADO",
];

export const ESTADO_META: Record<
  EstadoReparacion,
  { label: string; text: string; border: string; bg: string }
> = {
  RECIBIDO: {
    label: "Recibido",
    text: "text-estado-recibido",
    border: "border-estado-recibido",
    bg: "bg-estado-recibido/10",
  },
  DIAGNOSTICADO: {
    label: "Diagnosticado",
    text: "text-estado-diagnosticado",
    border: "border-estado-diagnosticado",
    bg: "bg-estado-diagnosticado/10",
  },
  AUTORIZAR: {
    label: "A autorizar",
    text: "text-estado-autorizar",
    border: "border-estado-autorizar",
    bg: "bg-estado-autorizar/10",
  },
  APROBADO: {
    label: "Aprobado",
    text: "text-estado-aprobado",
    border: "border-estado-aprobado",
    bg: "bg-estado-aprobado/10",
  },
  REPARADO: {
    label: "Reparado",
    text: "text-estado-reparado",
    border: "border-estado-reparado",
    bg: "bg-estado-reparado/10",
  },
  NO_REPARABLE: {
    label: "No reparable",
    text: "text-estado-no-reparable",
    border: "border-estado-no-reparable",
    bg: "bg-estado-no-reparable/10",
  },
  RECHAZADO: {
    label: "Rechazado",
    text: "text-estado-rechazado",
    border: "border-estado-rechazado",
    bg: "bg-estado-rechazado/10",
  },
  ENTREGADO: {
    label: "Entregado",
    text: "text-estado-entregado",
    border: "border-estado-entregado",
    bg: "bg-estado-entregado/10",
  },
};

export type Transicion = {
  estado: EstadoReparacion;
  roles: Rol[];
  // Exige un comentario explicando el motivo (queda en el historial).
  requiereMotivo?: boolean;
};

const AMBOS: Rol[] = ["ADMIN", "TECNICO"];
const ADMIN: Rol[] = ["ADMIN"];

// Transiciones que se hacen desde "Cambiar estado". Quedan afuera dos que
// tienen su propio camino:
//  - DIAGNOSTICADO → AUTORIZAR: ocurre sola al enviar el presupuesto.
//  - AUTORIZAR → APROBADO/RECHAZADO por el cliente: desde el link público.
// RECHAZADO es siempre una decisión del cliente (por el presupuesto o porque
// desistió); NO_REPARABLE es cuando el taller no puede repararlo. Todo
// termina en ENTREGADO, porque el equipo siempre vuelve al cliente.
export const TRANSICIONES: Record<EstadoReparacion, Transicion[]> = {
  RECIBIDO: [
    { estado: "DIAGNOSTICADO", roles: AMBOS },
    { estado: "NO_REPARABLE", roles: AMBOS, requiereMotivo: true },
    { estado: "RECHAZADO", roles: ADMIN, requiereMotivo: true },
  ],
  DIAGNOSTICADO: [
    { estado: "NO_REPARABLE", roles: AMBOS, requiereMotivo: true },
    { estado: "RECHAZADO", roles: ADMIN, requiereMotivo: true },
  ],
  AUTORIZAR: [
    { estado: "APROBADO", roles: ADMIN },
    { estado: "RECHAZADO", roles: ADMIN, requiereMotivo: true },
  ],
  APROBADO: [
    { estado: "REPARADO", roles: AMBOS },
    { estado: "NO_REPARABLE", roles: AMBOS, requiereMotivo: true },
  ],
  REPARADO: [{ estado: "ENTREGADO", roles: ADMIN }],
  NO_REPARABLE: [{ estado: "ENTREGADO", roles: ADMIN }],
  RECHAZADO: [{ estado: "ENTREGADO", roles: ADMIN }],
  ENTREGADO: [],
};

export function transicionesPara(estado: EstadoReparacion, rol: Rol): Transicion[] {
  return TRANSICIONES[estado].filter((t) => t.roles.includes(rol));
}

// El presupuesto se arma después del diagnóstico y se puede corregir (y
// reenviar) mientras el cliente no respondió. Después queda bloqueado.
export const ESTADOS_PRESUPUESTO_EDITABLE: EstadoReparacion[] = ["DIAGNOSTICADO", "AUTORIZAR"];
