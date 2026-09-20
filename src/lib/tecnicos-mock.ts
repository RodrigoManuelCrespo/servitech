// MOCK — Usuarios/Técnicos es dominio del "ticket Usuarios", todavía en
// curso. Son los mismos técnicos reales que carga prisma/seed.ts (sus IDs
// son reales), compartido entre las pantallas que ya lo necesitan (Nueva
// recepción, Reparaciones). Reemplazar por GET /api/usuarios?rol=TECNICO
// cuando ese ticket esté mergeado.

export const TECNICOS_MOCK = [
  { id: "usuario-gonzalo", nombre: "Gonzalo Pereyra" },
  { id: "usuario-lucia", nombre: "Lucía Fernández" },
  { id: "usuario-braian", nombre: "Braian Ibarra" },
];
