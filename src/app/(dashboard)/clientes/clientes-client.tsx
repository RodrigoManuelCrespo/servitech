"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

    type ClienteRow = {
    id: string;
    nombre: string;
    telefono: string;
    email: string | null;
    cantidadEquipos: number;
    };

    export default function ClientesClient() {
    const [search, setSearch] = useState("");
    const [clientes, setClientes] = useState<ClienteRow[] | null>(null);

    useEffect(() => {
        const timeout = setTimeout(() => {
        const query = search ? `?search=${encodeURIComponent(search)}` : "";
        fetch(`/api/clientes${query}`)
            .then((r) => r.json())
            .then(setClientes);
        }, 300);

        return () => clearTimeout(timeout);
    }, [search]);

    return (
        <div className="space-y-6">
        <div className="flex items-center justify-between">
            <h1 className="text-3xl font-bold">Clientes</h1>
            <Button render={<Link href="/reparaciones/nueva" />}>
            + Nueva recepción
            </Button>
        </div>

        <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nombre o teléfono..."
            className="w-full max-w-md rounded-lg border border-border bg-background px-4 py-2 text-sm outline-none focus:border-primary"
        />

        <div className="rounded-xl border border-border bg-card overflow-x-auto">
            <table className="w-full text-sm">
            <thead>
                <tr className="border-b border-border text-left text-xs tracking-wide text-muted-foreground uppercase">
                <th className="px-5 py-3 font-medium">Nombre</th>
                <th className="px-5 py-3 font-medium">Teléfono</th>
                <th className="px-5 py-3 font-medium">Email</th>
                <th className="px-5 py-3 font-medium">Equipos</th>
                <th className="px-5 py-3 font-medium"></th>
                </tr>
            </thead>
            <tbody>
                {clientes === null && (
                <tr>
                    <td colSpan={5} className="px-5 py-10 text-center text-muted-foreground">
                    Cargando...
                    </td>
                </tr>
                )}
                {clientes?.map((c) => (
                <tr key={c.id} className="border-b border-border last:border-0">
                    <td className="px-5 py-3 font-medium">{c.nombre}</td>
                    <td className="px-5 py-3 text-muted-foreground">{c.telefono}</td>
                    <td className="px-5 py-3 text-muted-foreground">{c.email ?? "—"}</td>
                    <td className="px-5 py-3 text-muted-foreground">{c.cantidadEquipos}</td>
                    <td className="px-5 py-3 text-right">
                    <Link href={`/clientes/${c.id}`} className="text-primary hover:underline">
                        Ver ficha →
                    </Link>
                    </td>
                </tr>
                ))}
                {clientes?.length === 0 && (
                <tr>
                    <td colSpan={5} className="px-5 py-10 text-center text-muted-foreground">
                    No se encontraron clientes.
                    </td>
                </tr>
                )}
            </tbody>
            </table>
        </div>
        </div>
    );
    }