import type { EstadoReparacion } from "@prisma/client";

export const ESTADOS: EstadoReparacion[] = [
  "RECIBIDO",
  "AUTORIZAR",
  "APROBADO",
  "REPARADO",
  "ENTREGADO",
  "RECHAZADO",
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
  ENTREGADO: {
    label: "Entregado",
    text: "text-estado-entregado",
    border: "border-estado-entregado",
    bg: "bg-estado-entregado/10",
  },
  RECHAZADO: {
    label: "Rechazado",
    text: "text-estado-rechazado",
    border: "border-estado-rechazado",
    bg: "bg-estado-rechazado/10",
  },
};
