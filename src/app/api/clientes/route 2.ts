import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

    export async function GET(req: NextRequest) {
    const session = await auth();
    if (!session?.user) {
        return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    const empresaId = session.user.empresaId;
    const search = req.nextUrl.searchParams.get("search")?.trim() ?? "";

    const clientes = await prisma.cliente.findMany({
        where: {
        empresaId,
        ...(search
            ? {
                OR: [
                { nombre: { contains: search, mode: "insensitive" } },
                { telefono: { contains: search, mode: "insensitive" } },
                ],
            }
            : {}),
        },
        orderBy: { nombre: "asc" },
        include: { _count: { select: { equipos: true } } },
    });

    const result = clientes.map((c) => ({
        id: c.id,
        nombre: c.nombre,
        telefono: c.telefono,
        email: c.email,
        cantidadEquipos: c._count.equipos,
    }));

    return NextResponse.json(result);
    }