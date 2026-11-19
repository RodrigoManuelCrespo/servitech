import "dotenv/config";
import { neonConfig } from "@neondatabase/serverless";
import { PrismaNeon } from "@prisma/adapter-neon";
import { PrismaClient, type EstadoReparacion } from "@prisma/client";
import bcrypt from "bcryptjs";
import ws from "ws";
import type { ChecklistRecepcion } from "../src/lib/checklist";

neonConfig.webSocketConstructor = ws;

const adapter = new PrismaNeon({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

// Datos de demo. ATENCIÓN: borra todos los clientes, equipos y reparaciones
// de la empresa y los vuelve a cargar. La empresa (nombre, logo) y los
// usuarios existentes no se tocan; los dos usuarios de demo se crean solo si
// faltan, así que sus contraseñas no cambian.
//
// Los emails de los clientes son @example.com (dominio reservado): si se
// configura un SMTP real, nunca le llega un correo a una persona real.

const DIA = 24 * 60 * 60 * 1000;
// Fecha relativa a hoy: hace(3, 10) = hace 3 días a las 10 h.
function hace(dias: number, hora = 10) {
  const fecha = new Date(Date.now() - dias * DIA);
  fecha.setHours(hora, Math.floor(Math.random() * 60), 0, 0);
  return fecha;
}

async function usuario(nombre: string, email: string, password: string, rol: "ADMIN" | "TECNICO", empresaId: string) {
  const existente = await prisma.usuario.findUnique({ where: { email } });
  if (existente) return existente;
  const passwordHash = await bcrypt.hash(password, 10);
  return prisma.usuario.create({ data: { nombre, email, passwordHash, rol, empresaId } });
}

function checklist(valores: string): ChecklistRecepcion {
  // "SSNNSA" → enciende, cargador, golpes, clave, datosRespaldados, accesorios
  const v = (c: string) => (c === "S" ? "SI" : c === "N" ? "NO" : "NA");
  return {
    enciende: v(valores[0]),
    cargador: v(valores[1]),
    golpes: v(valores[2]),
    clave: v(valores[3]),
    datosRespaldados: v(valores[4]),
    accesorios: v(valores[5]),
  };
}

type Paso = {
  estado: EstadoReparacion;
  dias: number;
  hora?: number;
  // "admin" | "tecnico" | "cliente" (respuesta desde el link de seguimiento)
  por: "admin" | "tecnico" | "cliente";
  comentario?: string;
};

type Demo = {
  id: string;
  equipoId: string;
  tecnico: boolean;
  fallaReportada: string;
  checklist: ChecklistRecepcion;
  diagnostico?: string;
  monto?: number;
  mensaje?: string;
  // Hace cuántos días se le mandó el aviso de retiro por email.
  avisoRetiroDias?: number;
  // El primer paso es el alta (RECIBIDO); el último define el estado actual.
  pasos: Paso[];
};

async function main() {
  const empresa =
    (await prisma.empresa.findFirst({ orderBy: { createdAt: "asc" } })) ??
    (await prisma.empresa.create({
      data: { nombre: "TechRevive", email: "techrevive.informatica@gmail.com", telefono: "3415024695" },
    }));

  const admin = await usuario("Marina Sosa", "admin@servitech.dev", "admin123", "ADMIN", empresa.id);
  const tecnico = await usuario("Eduardo Fucchi", "tecnico@servitech.dev", "tecnico123", "TECNICO", empresa.id);

  // Limpieza de los datos operativos de la empresa (en orden por las FK).
  const deLaEmpresa = { reparacion: { empresaId: empresa.id } };
  await prisma.documentoGenerado.deleteMany({ where: deLaEmpresa });
  await prisma.historialEstado.deleteMany({ where: deLaEmpresa });
  await prisma.fotoReparacion.deleteMany({ where: deLaEmpresa });
  await prisma.reparacion.deleteMany({ where: { empresaId: empresa.id } });
  await prisma.equipo.deleteMany({ where: { cliente: { empresaId: empresa.id } } });
  await prisma.cliente.deleteMany({ where: { empresaId: empresa.id } });

  const clientes = [
    { id: "cliente-roberto", nombre: "Roberto Aguilar", telefono: "3415550101", email: null, dias: 30 },
    { id: "cliente-peralta", nombre: "Estudio Contable Peralta", telefono: "3415550102", email: "administracion@estudioperalta.example.com", dias: 28 },
    { id: "cliente-julieta", nombre: "Julieta Mansilla", telefono: "3415550103", email: "julieta.mansilla@example.com", dias: 12 },
    { id: "cliente-diego", nombre: "Diego Cabrera", telefono: "3415550104", email: null, dias: 9 },
    { id: "cliente-farmacia", nombre: "Farmacia San Martín", telefono: "3415550105", email: "farmaciasanmartin@example.com", dias: 26 },
    { id: "cliente-nadia", nombre: "Nadia Villalba", telefono: "3415550106", email: "nadia.villalba@example.com", dias: 8 },
  ];
  for (const { dias, ...c } of clientes) {
    await prisma.cliente.create({ data: { ...c, empresaId: empresa.id, createdAt: hace(dias, 9) } });
  }

  const equipos = [
    { id: "equipo-lenovo", clienteId: "cliente-roberto", tipo: "Notebook", marca: "Lenovo", modelo: "IdeaPad 3", numeroSerie: "PF3K8XQ2" },
    { id: "equipo-galaxy", clienteId: "cliente-roberto", tipo: "Celular", marca: "Samsung", modelo: "Galaxy A54", numeroSerie: "R58W31LMNZK" },
    { id: "equipo-torre", clienteId: "cliente-peralta", tipo: "PC de escritorio", marca: "Armada", modelo: "Torre Ryzen 5", numeroSerie: "SIN-SERIE-001", observaciones: "Gabinete con etiqueta 'Puesto 2'" },
    { id: "equipo-latitude", clienteId: "cliente-peralta", tipo: "Notebook", marca: "Dell", modelo: "Latitude 5420", numeroSerie: "7HJ2KQ3" },
    { id: "equipo-pavilion", clienteId: "cliente-julieta", tipo: "Notebook", marca: "HP", modelo: "Pavilion 15", numeroSerie: "5CD1234XYZ" },
    { id: "equipo-epson", clienteId: "cliente-diego", tipo: "Impresora", marca: "Epson", modelo: "L3250", numeroSerie: "X8JZ004512" },
    { id: "equipo-optiplex", clienteId: "cliente-farmacia", tipo: "PC de escritorio", marca: "Dell", modelo: "OptiPlex 3080", numeroSerie: "9MNB2R3" },
    { id: "equipo-laserjet", clienteId: "cliente-farmacia", tipo: "Impresora", marca: "HP", modelo: "LaserJet Pro M15w", numeroSerie: "VNB3K12345" },
    { id: "equipo-vivobook", clienteId: "cliente-nadia", tipo: "Notebook", marca: "Asus", modelo: "VivoBook 14", numeroSerie: "N2NRCV05A123" },
    { id: "equipo-moto", clienteId: "cliente-nadia", tipo: "Celular", marca: "Motorola", modelo: "Moto G32", numeroSerie: "ZY22H7LQ9P" },
  ];
  await prisma.equipo.createMany({ data: equipos });

  const reparaciones: Demo[] = [
    {
      id: "reparacion-1001",
      equipoId: "equipo-laserjet",
      tecnico: true,
      fallaReportada: "Las hojas salen con una franja gris en el costado.",
      checklist: checklist("SSNASN"),
      diagnostico: "Tambor del tóner rayado. Se reemplaza el cartucho y se limpia el rodillo de transferencia.",
      monto: 28000,
      mensaje: "Incluye cartucho de tóner nuevo y limpieza.",
      pasos: [
        { estado: "RECIBIDO", dias: 25, por: "admin" },
        { estado: "DIAGNOSTICADO", dias: 24, por: "tecnico" },
        { estado: "AUTORIZAR", dias: 24, hora: 16, por: "admin", comentario: "Presupuesto enviado al cliente." },
        { estado: "APROBADO", dias: 23, por: "cliente" },
        { estado: "REPARADO", dias: 22, por: "tecnico" },
        { estado: "ENTREGADO", dias: 21, por: "admin" },
      ],
    },
    {
      id: "reparacion-1002",
      equipoId: "equipo-lenovo",
      tecnico: true,
      fallaReportada: "No carga la batería. El cargador funciona con otra notebook.",
      checklist: checklist("SSNSNN"),
      diagnostico: "Pin de carga flojo en el conector DC de la placa. Se resuelda el conector.",
      monto: 45000,
      mensaje: "Reparación del conector de carga. Garantía de 90 días.",
      pasos: [
        { estado: "RECIBIDO", dias: 20, por: "admin" },
        { estado: "DIAGNOSTICADO", dias: 19, por: "tecnico" },
        { estado: "AUTORIZAR", dias: 19, hora: 15, por: "admin", comentario: "Presupuesto enviado al cliente." },
        { estado: "APROBADO", dias: 18, por: "cliente" },
        { estado: "REPARADO", dias: 16, por: "tecnico" },
        { estado: "ENTREGADO", dias: 15, por: "admin" },
      ],
    },
    {
      id: "reparacion-1003",
      equipoId: "equipo-torre",
      tecnico: true,
      fallaReportada: "Se reinicia sola cuando se abren varios programas.",
      checklist: checklist("SNNANN"),
      diagnostico: "Fuente de 450 W con capacitores inflados y placa de video con artefactos. Se recomienda cambiar ambas.",
      monto: 180000,
      mensaje: "Fuente certificada 550 W y placa de video equivalente.",
      pasos: [
        { estado: "RECIBIDO", dias: 14, por: "admin" },
        { estado: "DIAGNOSTICADO", dias: 13, por: "tecnico" },
        { estado: "AUTORIZAR", dias: 13, hora: 17, por: "admin", comentario: "Presupuesto enviado al cliente." },
        { estado: "RECHAZADO", dias: 12, por: "cliente", comentario: "Me parece caro. ¿Hay alguna opción más económica?" },
      ],
    },
    {
      id: "reparacion-1004",
      equipoId: "equipo-pavilion",
      tecnico: true,
      fallaReportada: "La pantalla parpadea y a veces se pone negra al mover la tapa.",
      checklist: checklist("SSNSSN"),
      diagnostico: "Flex de video dañado en la bisagra. Se reemplaza el flex.",
      monto: 60000,
      mensaje: "Cambio de flex de video. El equipo queda con garantía de 90 días.",
      pasos: [
        { estado: "RECIBIDO", dias: 10, por: "admin" },
        { estado: "DIAGNOSTICADO", dias: 9, por: "tecnico" },
        { estado: "AUTORIZAR", dias: 9, hora: 16, por: "admin", comentario: "Presupuesto enviado al cliente." },
        { estado: "APROBADO", dias: 8, por: "cliente" },
        { estado: "REPARADO", dias: 3, por: "tecnico" },
      ],
    },
    {
      id: "reparacion-1005",
      equipoId: "equipo-epson",
      tecnico: true,
      fallaReportada: "No toma el papel y las hojas salen manchadas.",
      checklist: checklist("SSNANS"),
      diagnostico: "Rodillo de arrastre gastado y cabezal con tinta seca. Cambio de rodillo y limpieza profunda.",
      monto: 35000,
      pasos: [
        { estado: "RECIBIDO", dias: 8, por: "admin" },
        { estado: "DIAGNOSTICADO", dias: 7, por: "tecnico" },
        { estado: "AUTORIZAR", dias: 7, hora: 15, por: "admin", comentario: "Presupuesto enviado al cliente." },
        { estado: "APROBADO", dias: 6, por: "admin", comentario: "Respondió por WhatsApp." },
      ],
    },
    {
      id: "reparacion-1006",
      equipoId: "equipo-moto",
      tecnico: true,
      fallaReportada: "Se mojó y no enciende.",
      checklist: checklist("NNNNNA"),
      avisoRetiroDias: 5,
      pasos: [
        { estado: "RECIBIDO", dias: 7, por: "admin" },
        {
          estado: "NO_REPARABLE",
          dias: 6,
          por: "tecnico",
          comentario: "Placa con corrosión severa por humedad. No hay repuesto disponible para este modelo.",
        },
      ],
    },
    {
      id: "reparacion-1007",
      equipoId: "equipo-optiplex",
      tecnico: true,
      fallaReportada: "Está muy lenta y tarda varios minutos en arrancar.",
      checklist: checklist("SSNSSN"),
      diagnostico: [
        "Problema encontrado: disco rígido con sectores dañados (SMART en estado crítico).",
        "Solución propuesta: reemplazo por SSD de 480 GB y reinstalación del sistema.",
        "Repuestos necesarios: SSD 480 GB SATA.",
        "Costo estimado de repuestos y mano de obra: $45.000 SSD + 3 h de trabajo.",
        "Tiempo estimado de reparación: 3 días hábiles.",
      ].join("\n"),
      monto: 95000,
      mensaje: [
        "Trabajo a realizar: cambio de disco por SSD 480 GB, reinstalación de Windows y copia de los archivos del sistema de la farmacia.",
        "Plazo estimado: 3 días hábiles",
        "Garantía: 6 meses en el SSD, 90 días en la mano de obra",
        "Validez del presupuesto: 7 días",
      ].join("\n"),
      pasos: [
        { estado: "RECIBIDO", dias: 5, por: "admin" },
        { estado: "DIAGNOSTICADO", dias: 4, por: "tecnico" },
        { estado: "AUTORIZAR", dias: 4, hora: 17, por: "admin", comentario: "Presupuesto enviado al cliente." },
      ],
    },
    {
      id: "reparacion-1008",
      equipoId: "equipo-vivobook",
      tecnico: true,
      fallaReportada: "Se calienta mucho y se apaga sola después de un rato.",
      checklist: checklist("SSNSSN"),
      diagnostico: [
        "Problema encontrado: ventilador obstruido con polvo y pasta térmica seca; el procesador llega a 98 °C.",
        "Solución propuesta: limpieza interna completa y cambio de pasta térmica.",
        "Repuestos necesarios: pasta térmica.",
        "Costo estimado de repuestos y mano de obra: $5.000 pasta + 1,5 h de trabajo.",
        "Tiempo estimado de reparación: 1 día.",
      ].join("\n"),
      pasos: [
        { estado: "RECIBIDO", dias: 3, por: "admin" },
        { estado: "DIAGNOSTICADO", dias: 2, por: "tecnico" },
      ],
    },
    {
      id: "reparacion-1009",
      equipoId: "equipo-galaxy",
      tecnico: true,
      fallaReportada: "Pantalla rota después de una caída. El táctil responde a medias.",
      checklist: checklist("SNSSNS"),
      pasos: [{ estado: "RECIBIDO", dias: 1, por: "admin" }],
    },
    {
      id: "reparacion-1010",
      equipoId: "equipo-latitude",
      tecnico: false,
      fallaReportada: "Varias teclas no responden (la E, la R y la barra espaciadora).",
      checklist: checklist("SSNSAN"),
      pasos: [{ estado: "RECIBIDO", dias: 0, hora: 9, por: "admin" }],
    },
  ];

  const usuarioDe = { admin: admin.id, tecnico: tecnico.id, cliente: null };
  const conEmail = new Set(clientes.filter((c) => c.email).map((c) => c.id));

  for (const r of reparaciones) {
    // Todas las fechas salen del historial, para que coincidan entre sí.
    const fechas = r.pasos.map((p, i) => hace(p.dias, p.hora ?? 10 + i));
    const ultimo = r.pasos[r.pasos.length - 1];
    const fechaIngreso = fechas[0];
    const fechaUltimo = fechas[fechas.length - 1];
    const presupuestoEnviado = r.pasos.some((p) => p.estado === "AUTORIZAR");
    const equipo = equipos.find((e) => e.id === r.equipoId)!;

    await prisma.reparacion.create({
      data: {
        id: r.id,
        empresaId: empresa.id,
        equipoId: r.equipoId,
        tecnicoAsignadoId: r.tecnico ? tecnico.id : null,
        estado: ultimo.estado,
        fallaReportada: r.fallaReportada,
        checklist: r.checklist,
        diagnostico: r.diagnostico,
        montoPresupuesto: r.monto,
        mensajePresupuesto: r.mensaje,
        linkToken: presupuestoEnviado ? crypto.randomUUID() : null,
        fechaIngreso,
        createdAt: fechaIngreso,
        updatedAt: fechaUltimo,
        fechaEntrega: ultimo.estado === "ENTREGADO" ? fechaUltimo : null,
      },
    });

    await prisma.historialEstado.createMany({
      data: r.pasos.map((p, i) => ({
        reparacionId: r.id,
        estadoAnterior: i === 0 ? null : r.pasos[i - 1].estado,
        estadoNuevo: p.estado,
        usuarioId: usuarioDe[p.por],
        fecha: fechas[i],
        comentario: p.comentario ?? null,
      })),
    });

    // Lo que habría registrado la app: la orden y el presupuesto por email
    // si el cliente tiene email; si no, el presupuesto por WhatsApp.
    const documentos = [];
    if (conEmail.has(equipo.clienteId)) {
      documentos.push({ tipoDocumento: "ORDEN_PDF", canalEnvio: "EMAIL" as const, estadoEnvio: "ENVIADO" as const, fechaEnvio: fechaIngreso });
    }
    const envio = r.pasos.findIndex((p) => p.estado === "AUTORIZAR");
    if (envio !== -1) {
      const canalEnvio = conEmail.has(equipo.clienteId) ? ("EMAIL" as const) : ("WHATSAPP_MOCK" as const);
      documentos.push({ tipoDocumento: "PRESUPUESTO", canalEnvio, estadoEnvio: "ENVIADO" as const, fechaEnvio: fechas[envio] });
    }
    if (r.avisoRetiroDias !== undefined && conEmail.has(equipo.clienteId)) {
      documentos.push({ tipoDocumento: "AVISO_RETIRO", canalEnvio: "EMAIL" as const, estadoEnvio: "ENVIADO" as const, fechaEnvio: hace(r.avisoRetiroDias, 11) });
    }
    if (documentos.length) {
      await prisma.documentoGenerado.createMany({ data: documentos.map((d) => ({ ...d, reparacionId: r.id })) });
    }
  }

  console.log("Seed OK:", {
    empresa: empresa.nombre,
    usuarios: [admin.email, tecnico.email],
    clientes: clientes.length,
    equipos: equipos.length,
    reparaciones: reparaciones.length,
  });
}

main()
  .catch((e) => {
    console.error("Seed falló:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
