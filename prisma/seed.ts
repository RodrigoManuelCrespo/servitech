import "dotenv/config";
import { neonConfig } from "@neondatabase/serverless";
import { PrismaNeon } from "@prisma/adapter-neon";
import { PrismaClient, type EstadoReparacion } from "@prisma/client";
import bcrypt from "bcryptjs";
import ws from "ws";

neonConfig.webSocketConstructor = ws;

const adapter = new PrismaNeon({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function usuario(
  id: string,
  nombre: string,
  email: string,
  password: string,
  rol: "ADMIN" | "TECNICO",
  empresaId: string,
) {
  const passwordHash = await bcrypt.hash(password, 10);
  return prisma.usuario.upsert({
    where: { email },
    update: { nombre },
    create: { id, nombre, email, passwordHash, rol, empresaId },
  });
}

async function cliente(id: string, empresaId: string, nombre: string, telefono: string) {
  return prisma.cliente.upsert({
    where: { id },
    update: { nombre, telefono },
    create: { id, empresaId, nombre, telefono },
  });
}

async function equipo(
  id: string,
  clienteId: string,
  tipo: string,
  marca: string,
  modelo: string,
) {
  return prisma.equipo.upsert({
    where: { id },
    update: { tipo, marca, modelo },
    create: { id, clienteId, tipo, marca, modelo },
  });
}

async function reparacion(
  id: string,
  empresaId: string,
  equipoId: string,
  tecnicoAsignadoId: string,
  estado: EstadoReparacion,
) {
  return prisma.reparacion.upsert({
    where: { id },
    update: { estado, tecnicoAsignadoId },
    create: { id, empresaId, equipoId, tecnicoAsignadoId, estado },
  });
}

async function main() {
  const empresa = await prisma.empresa.upsert({
    where: { id: "empresa-demo" },
    update: {},
    create: {
      id: "empresa-demo",
      nombre: "ServiTech Demo",
      email: "contacto@servitech.dev",
    },
  });

  const admin = await usuario(
    "usuario-admin",
    "Marina Sosa",
    "admin@servitech.dev",
    "admin123",
    "ADMIN",
    empresa.id,
  );
  const gonzalo = await usuario(
    "usuario-gonzalo",
    "Gonzalo Pereyra",
    "gonzalo@servitech.dev",
    "tecnico123",
    "TECNICO",
    empresa.id,
  );
  const lucia = await usuario(
    "usuario-lucia",
    "Lucía Fernández",
    "lucia@servitech.dev",
    "tecnico123",
    "TECNICO",
    empresa.id,
  );
  const braian = await usuario(
    "usuario-braian",
    "Braian Ibarra",
    "braian@servitech.dev",
    "tecnico123",
    "TECNICO",
    empresa.id,
  );

  const roberto = await cliente("cliente-roberto", empresa.id, "Roberto Aguilar", "1122334455");
  const estudioPeralta = await cliente("cliente-peralta", empresa.id, "Estudio Contable Peralta", "1133445566");
  const julieta = await cliente("cliente-julieta", empresa.id, "Julieta Mansilla", "1144556677");
  const diego = await cliente("cliente-diego", empresa.id, "Diego Cabrera", "1155667788");
  const farmacia = await cliente("cliente-farmacia", empresa.id, "Farmacia San Martín", "1166778899");
  const nadia = await cliente("cliente-nadia", empresa.id, "Nadia Villalba", "1177889900");

  const eqLenovo = await equipo("equipo-lenovo", roberto.id, "Notebook", "Lenovo", "IdeaPad 3");
  const eqGalaxy = await equipo("equipo-galaxy", roberto.id, "Celular", "Samsung", "Galaxy A54");
  const eqTorre = await equipo("equipo-torre", estudioPeralta.id, "PC de escritorio", "Armada", "Torre gamer");
  const eqLatitude = await equipo("equipo-latitude", estudioPeralta.id, "Notebook", "Dell", "Latitude 5420");
  const eqPavilion = await equipo("equipo-pavilion", julieta.id, "Notebook", "HP", "Pavilion 15");
  const eqEpson = await equipo("equipo-epson", diego.id, "Impresora", "Epson", "L3250");
  const eqOptiplex = await equipo("equipo-optiplex", farmacia.id, "PC de escritorio", "Dell", "OptiPlex 3080");
  const eqVivobook = await equipo("equipo-vivobook", nadia.id, "Notebook", "Asus", "VivoBook 14");

  await reparacion("reparacion-1001", empresa.id, eqLenovo.id, gonzalo.id, "ENTREGADO");
  await reparacion("reparacion-1002", empresa.id, eqTorre.id, lucia.id, "RECHAZADO");
  await reparacion("reparacion-1003", empresa.id, eqPavilion.id, gonzalo.id, "REPARADO");
  await reparacion("reparacion-1004", empresa.id, eqEpson.id, braian.id, "APROBADO");
  await reparacion("reparacion-1005", empresa.id, eqOptiplex.id, lucia.id, "AUTORIZAR");
  await reparacion("reparacion-1006", empresa.id, eqVivobook.id, gonzalo.id, "RECIBIDO");
  await reparacion("reparacion-1007", empresa.id, eqGalaxy.id, braian.id, "RECIBIDO");
  await reparacion("reparacion-1008", empresa.id, eqLatitude.id, lucia.id, "APROBADO");

  console.log("Seed OK:", {
    empresa: empresa.nombre,
    usuarios: [admin.email, gonzalo.email, lucia.email, braian.email],
    reparaciones: 8,
  });
}

main()
  .catch((e) => {
    console.error("Seed falló:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
