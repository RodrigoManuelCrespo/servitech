import "dotenv/config";
import { neonConfig } from "@neondatabase/serverless";
import { PrismaNeon } from "@prisma/adapter-neon";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import ws from "ws";

neonConfig.webSocketConstructor = ws;

const adapter = new PrismaNeon({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

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

  const passwordHash = await bcrypt.hash("admin123", 10);

  const admin = await prisma.usuario.upsert({
    where: { email: "admin@servitech.dev" },
    update: {},
    create: {
      email: "admin@servitech.dev",
      nombre: "Admin Demo",
      passwordHash,
      rol: "ADMIN",
      empresaId: empresa.id,
    },
  });

  console.log("Seed OK:", { empresa: empresa.nombre, admin: admin.email });
}

main()
  .catch((e) => {
    console.error("Seed falló:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
