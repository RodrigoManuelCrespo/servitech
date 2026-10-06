import { NextResponse } from "next/server";
import { requireApiAdmin } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

// Esquema de validación con Zod (todos los campos opcionales)
const editarUsuarioSchema = z.object({
  nombre: z.string().min(2, "El nombre debe tener al menos 2 caracteres").optional(),
  email: z.string().email("Formato de email inválido").optional(),
  rol: z
    .enum(["ADMIN", "TECNICO"], {
      message: "Rol inválido",
    })
    .optional(),
  activo: z.boolean().optional(),
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const auth = await requireApiAdmin();
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }
    const { session } = auth;

    const { id } = await params;
    const empresaId = session.user.empresaId;

    // El usuario a editar tiene que pertenecer a la empresa de la sesión
    const existente = await prisma.usuario.findFirst({ where: { id, empresaId } });
    if (!existente) {
      return NextResponse.json({ error: "Usuario no encontrado." }, { status: 404 });
    }

    const body = await request.json();
    const result = editarUsuarioSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error.issues[0].message },
        { status: 400 }
      );
    }

    const { nombre, email, rol, activo } = result.data;

    // Evita que el admin se bloquee a sí mismo
    if (id === session.user.id) {
      if (activo === false) {
        return NextResponse.json(
          { error: "No podés desactivar tu propia cuenta." },
          { status: 400 }
        );
      }
      if (rol === "TECNICO") {
        return NextResponse.json(
          { error: "No podés quitarte el rol de administrador." },
          { status: 400 }
        );
      }
    }

    // Solo se revalida el email si realmente cambió (unique constraint global)
    const emailNormalizado = email?.toLowerCase().trim();
    if (emailNormalizado && emailNormalizado !== existente.email) {
      const existeEmail = await prisma.usuario.findUnique({
        where: { email: emailNormalizado },
      });

      if (existeEmail) {
        return NextResponse.json(
          { error: "El email ya se encuentra registrado en el sistema." },
          { status: 400 }
        );
      }
    }

    const usuarioActualizado = await prisma.usuario.update({
      where: { id },
      data: {
        ...(nombre !== undefined && { nombre: nombre.trim() }),
        ...(emailNormalizado !== undefined && { email: emailNormalizado }),
        ...(rol !== undefined && { rol }),
        ...(activo !== undefined && { activo }),
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

    return NextResponse.json(usuarioActualizado);
  } catch (error) {
    console.error("Error PATCH /api/usuarios/[id]:", error);
    return NextResponse.json(
      { error: "Error interno al editar el usuario." },
      { status: 500 }
    );
  }
}
