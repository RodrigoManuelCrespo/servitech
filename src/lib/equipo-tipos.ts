export const EQUIPO_TIPOS = [
  "Notebook",
  "Celular",
  "PC de escritorio",
  "Impresora",
  "Tablet",
  "Monitor",
  "Otro",
] as const;

export type EquipoTipo = (typeof EQUIPO_TIPOS)[number];
