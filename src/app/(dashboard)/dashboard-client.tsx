"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { ESTADOS, ESTADO_META } from "@/lib/estado";
import { cn } from "@/lib/utils";

type Estado = (typeof ESTADOS)[number];

type DashboardData = {
    counts: Record<Estado, number>;
    ultimas: {
        id: string;
        cliente: string;
        equipo: string;
        estado: Estado;
        tecnico: string | null;
        updatedAt: string;
    }[];
};

const fechaFmt = new Intl.DateTimeFormat("es-AR", {
    day: "numeric",
    month: "long",
    year: "numeric",
});
const fechaHoraFmt = new Intl.DateTimeFormat("es-AR", {
    dateStyle: "short",
    timeStyle: "short",
});

export default function DashboardClient() {
    const [data, setData] = useState<DashboardData | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        fetch("/api/dashboard")
            .then((r) => {
                if (!r.ok) throw new Error();
                return r.json();
            })
            .then(setData)
            .catch(() => setError("No se pudieron cargar los datos del dashboard."));
    }, []);

    if (error) return <p className="text-sm text-destructive">{error}</p>;
    if (!data) return <p className="text-muted-foreground">Cargando...</p>;

    const { counts, ultimas } = data;

    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-3xl font-bold">Dashboard</h1>
                <p className="text-muted-foreground">
                    Resumen general de reparaciones — {fechaFmt.format(new Date())}
                </p>
            </div>

            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
                {ESTADOS.map((estado) => {
                    const meta = ESTADO_META[estado];
                    return (
                        <div
                            key={estado}
                            className={cn("rounded-xl border-t-2 bg-card p-4", meta.border)}
                        >
                            <p
                                className={cn(
                                    "text-xs font-semibold tracking-wide uppercase",
                                    meta.text,
                                )}
                            >
                                {meta.label}
                            </p>
                            <p className="mt-2 text-3xl font-bold">{counts[estado] ?? 0}</p>
                        </div>
                    );
                })}
            </div>

            <div className="rounded-xl border border-border bg-card">
                <div className="flex items-center justify-between border-b border-border px-5 py-4">
                    <h2 className="font-semibold">Últimas reparaciones con movimiento</h2>
                    <Button
                        variant="outline"
                        nativeButton={false}
                        render={<Link href="/reparaciones" />}
                    >
                        Ver todas
                    </Button>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-border text-left text-xs tracking-wide text-muted-foreground uppercase">
                                <th className="px-5 py-3 font-medium">N°</th>
                                <th className="px-5 py-3 font-medium">Cliente</th>
                                <th className="px-5 py-3 font-medium">Equipo</th>
                                <th className="px-5 py-3 font-medium">Estado</th>
                                <th className="px-5 py-3 font-medium">Técnico</th>
                                <th className="px-5 py-3 font-medium">Última actualización</th>
                            </tr>
                        </thead>
                        <tbody>
                            {ultimas.map((r) => (
                                <tr key={r.id} className="border-b border-border last:border-0">
                                    <td className="px-5 py-3">
                                        <Link
                                            href={`/reparaciones/${r.id}`}
                                            className="font-medium text-primary hover:underline"
                                        >
                                            #{r.id.slice(-4)}
                                        </Link>
                                    </td>
                                    <td className="px-5 py-3">{r.cliente}</td>
                                    <td className="px-5 py-3 text-muted-foreground">{r.equipo}</td>
                                    <td className="px-5 py-3">
                                        <StatusBadge estado={r.estado} />
                                    </td>
                                    <td className="px-5 py-3 text-muted-foreground">
                                        {r.tecnico ?? "—"}
                                    </td>
                                    <td className="px-5 py-3 text-muted-foreground">
                                        {fechaHoraFmt.format(new Date(r.updatedAt))}
                                    </td>
                                </tr>
                            ))}
                            {ultimas.length === 0 && (
                                <tr>
                                    <td
                                        colSpan={6}
                                        className="px-5 py-10 text-center text-muted-foreground"
                                    >
                                        Todavía no hay reparaciones cargadas.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}