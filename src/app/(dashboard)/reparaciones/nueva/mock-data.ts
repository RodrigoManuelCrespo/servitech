// MOCK — Cliente es dominio del "ticket Clientes", todavía en curso. Son
// los mismos clientes reales que carga prisma/seed.ts (los IDs son reales),
// fijados a mano acá para poder probar el wizard de punta a punta sin
// construir ese endpoint todavía. Reemplazar por GET /api/clientes cuando
// ese ticket esté mergeado.
//
// La lista de técnicos mockeada vive en src/lib/tecnicos-mock.ts porque la
// necesita más de una pantalla.

export const CLIENTES_MOCK = [
  { id: "cliente-roberto", nombre: "Roberto Aguilar", telefono: "1122334455" },
  { id: "cliente-peralta", nombre: "Estudio Contable Peralta", telefono: "1133445566" },
  { id: "cliente-julieta", nombre: "Julieta Mansilla", telefono: "1144556677" },
  { id: "cliente-diego", nombre: "Diego Cabrera", telefono: "1155667788" },
  { id: "cliente-farmacia", nombre: "Farmacia San Martín", telefono: "1166778899" },
  { id: "cliente-nadia", nombre: "Nadia Villalba", telefono: "1177889900" },
];

export type ClienteMock = (typeof CLIENTES_MOCK)[number];
