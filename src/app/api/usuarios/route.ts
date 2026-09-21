import { NextResponse } from "next/server";
import { requireSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import bcrypt from "bcryptjs";

// Esquema de validación con Zod
const crearUsuarioSchema = z.object({
  nombre: z.string().min(2, "El nombre debe tener al menos 2 caracteres"),
  email: z.string().email("Formato de email inválido"),
  password: z.string().min(6, "La contraseña debe tener al menos 6 caracteres"),
  rol: z.enum(["ADMIN", "TECNICO"], {
    message: "Rol inválido",
  }),
});

export async function GET() {
  try {
    const session = await requireSession();

    // Bloqueo estricto para no administradores
    if (session.user.rol !== "ADMIN") {
      return NextResponse.json(
        { error: "Acceso denegado. Se requiere rol ADMIN." },
        { status: 403 }
      );
    }

    const usuarios = await prisma.usuario.findMany({
      where: { empresaId: session.user.empresaId },
      select: {
        id: true,
        nombre: true,
        email: true,
        rol: true,
        activo: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(usuarios);
  } catch (error) {
    console.error("Error GET /api/usuarios:", error);
    return NextResponse.json(
      { error: "Error al obtener la lista de usuarios." },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const session = await requireSession();

    if (session.user.rol !== "ADMIN") {
      return NextResponse.json(
        { error: "Acceso denegado. Se requiere rol ADMIN." },
        { status: 403 }
      );
    }

    const body = await request.json();
    const result = crearUsuarioSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error.issues[0].message },
        { status: 400 }
      );
    }

    const { nombre, email, password, rol } = result.data;

    // Chequeo de email duplicado globalmente (unique constraint en Usuario.email)
    const existeEmail = await prisma.usuario.findUnique({
      where: { email: email.toLowerCase().trim() },
    });

    if (existeEmail) {
      return NextResponse.json(
        { error: "El email ya se encuentra registrado en el sistema." },
        { status: 400 }
      );
    }

    // Hasheo de contraseña
    const passwordHash = await bcrypt.hash(password, 10);

    // Creación garantizando el empresaId de la sesión
    const nuevoUsuario = await prisma.usuario.create({
      data: {
        nombre: nombre.trim(),
        email: email.toLowerCase().trim(),
        passwordHash,
        rol,
        empresaId: session.user.empresaId,
      },
      select: {
        id: true,
        nombre: true,
        email: true,
        rol: true,
        activo: true,
        createdAt: true,
      },
    });

    return NextResponse.json(nuevoUsuario, { status: 201 });
  } catch (error) {
    console.error("Error POST /api/usuarios:", error);
    return NextResponse.json(
      { error: "Error interno al crear el usuario." },
      { status: 500 }
    );
  }
}