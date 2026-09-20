// MOCK — Cliente y Usuario/Técnico son dominio de otros tickets en curso
// ("ticket Clientes", "ticket Usuarios"). Estos son los mismos clientes y
// técnicos que ya carga prisma/seed.ts, fijados a mano acá para poder probar
// el wizard de punta a punta sin construir esos endpoints todavía — los IDs
// son reales, así que Equipo y Reparacion sí se crean de verdad contra ellos.
//
// Reemplazar por GET /api/clientes y GET /api/usuarios?rol=TECNICO cuando
// esos tickets estén mergeados.

export const CLIENTES_MOCK = [
  { id: "cliente-roberto", nombre: "Roberto Aguilar", telefono: "1122334455" },
  { id: "cliente-peralta", nombre: "Estudio Contable Peralta", telefono: "1133445566" },
  { id: "cliente-julieta", nombre: "Julieta Mansilla", telefono: "1144556677" },
  { id: "cliente-diego", nombre: "Diego Cabrera", telefono: "1155667788" },
  { id: "cliente-farmacia", nombre: "Farmacia San Martín", telefono: "1166778899" },
  { id: "cliente-nadia", nombre: "Nadia Villalba", telefono: "1177889900" },
];

export type ClienteMock = (typeof CLIENTES_MOCK)[number];

export const TECNICOS_MOCK = [
  { id: "usuario-gonzalo", nombre: "Gonzalo Pereyra" },
  { id: "usuario-lucia", nombre: "Lucía Fernández" },
  { id: "usuario-braian", nombre: "Braian Ibarra" },
];
