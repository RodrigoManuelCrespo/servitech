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

// Transiciones que se hacen desde "Cambiar estado". Quedan afuera tres que
// tienen su propio camino:
//  - DIAGNOSTICADO → AUTORIZAR: ocurre sola al enviar el presupuesto.
//  - RECHAZADO → AUTORIZAR: al enviar un nuevo presupuesto (ver abajo).
//  - AUTORIZAR → APROBADO/RECHAZADO por el cliente: desde el link público.
// RECHAZADO es siempre una decisión del cliente (por el presupuesto o porque
// desistió); NO_REPARABLE es cuando el taller no puede repararlo. Todo
// termina en ENTREGADO, porque el equipo siempre vuelve al cliente.
// NO_REPARABLE → RECIBIDO es la "segunda opinión": antes de devolverlo sin
// reparar, el admin puede mandarlo a revisar de nuevo (y reasignarlo).
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
  NO_REPARABLE: [
    { estado: "RECIBIDO", roles: ADMIN, requiereMotivo: true },
    { estado: "ENTREGADO", roles: ADMIN },
  ],
  RECHAZADO: [{ estado: "ENTREGADO", roles: ADMIN }],
  ENTREGADO: [],
};

export function transicionesPara(estado: EstadoReparacion, rol: Rol): Transicion[] {
  return TRANSICIONES[estado].filter((t) => t.roles.includes(rol));
}

// El presupuesto se arma después del diagnóstico y se puede corregir (y
// reenviar) mientras el cliente no respondió.
export const ESTADOS_PRESUPUESTO_EDITABLE: EstadoReparacion[] = ["DIAGNOSTICADO", "AUTORIZAR"];

// Si el cliente rechazó un presupuesto (le pareció caro, quiere otra
// opción), el admin puede modificarlo y mandarle uno nuevo: la reparación
// vuelve a "A autorizar". Solo si el rechazo fue de un presupuesto enviado
// (tiene link); si desistió antes, no hay nada que volver a presupuestar.
export function presupuestoEditable(estado: EstadoReparacion, presupuestoEnviado: boolean) {
  return (
    ESTADOS_PRESUPUESTO_EDITABLE.includes(estado) || (estado === "RECHAZADO" && presupuestoEnviado)
  );
}

// El cliente aprueba un presupuesto basado en el diagnóstico: una vez
// enviado, el diagnóstico queda fijo para que no cambie lo que se aprobó.
// Antes de enviarlo lo cargan o corrigen el técnico asignado o el admin; si
// el cliente rechazó, el admin puede replantearlo para mandar otro
// presupuesto. Depende del estado, no del rol: un admin que también repara
// hace todo el flujo desde su cuenta.
export function diagnosticoEditable(
  estado: EstadoReparacion,
  rol: Rol,
  presupuestoEnviado: boolean,
) {
  if (estado === "RECIBIDO" || estado === "DIAGNOSTICADO") return true;
  return estado === "RECHAZADO" && presupuestoEnviado && rol === "ADMIN";
}

// El técnico asignado se puede cambiar mientras el trabajo está pendiente.
// Después queda como registro de quién lo hizo.
export const ESTADOS_REASIGNABLES: EstadoReparacion[] = [
  "RECIBIDO",
  "DIAGNOSTICADO",
  "AUTORIZAR",
  "APROBADO",
];

// Estados en los que el equipo está listo para que el cliente lo retire
// (reparado o no): el admin le puede mandar el aviso de retiro.
export const ESTADOS_PARA_RETIRAR: EstadoReparacion[] = ["REPARADO", "NO_REPARABLE", "RECHAZADO"];
