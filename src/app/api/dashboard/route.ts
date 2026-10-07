import { NextResponse } from "next/server";
import { requireApiSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { ESTADOS } from "@/lib/estado";

export async function GET() {
    const session = await requireApiSession();
    if (!session) {
        return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    const empresaId = session.user.empresaId;

    const [grouped, ultimas] = await Promise.all([
        prisma.reparacion.groupBy({
            by: ["estado"],
            where: { empresaId },
            _count: true,
        }),
        prisma.reparacion.findMany({
            where: { empresaId },
            orderBy: { updatedAt: "desc" },
            take: 8,
            include: {
                equipo: { include: { cliente: true } },
                tecnicoAsignado: true,
            },
        }),
    ]);

    const counts = Object.fromEntries(ESTADOS.map((e) => [e, 0])) as Record<
        (typeof ESTADOS)[number],
        number
    >;
    for (const g of grouped) {
        counts[g.estado as keyof typeof counts] = g._count;
    }

    return NextResponse.json({
        counts,
        ultimas: ultimas.map((r) => ({
            id: r.id,
            cliente: r.equipo.cliente.nombre,
            equipo: `${r.equipo.marca} ${r.equipo.modelo}`,
            estado: r.estado,
            tecnico: r.tecnicoAsignado?.nombre ?? null,
            updatedAt: r.updatedAt,
        })),
    });
}