"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { StatusBadge } from "@/components/status-badge";
import { EstadoReparacion } from "@prisma/client"; 
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";

const fechaFmt = new Intl.DateTimeFormat("es-AR", { dateStyle: "short" });

    type Reparacion = {
    id: string;
    estado: EstadoReparacion;
    fechaIngreso: string;
    fechaEntrega: string | null;
    };

    type Equipo = {
    id: string;
    tipo: string;
    marca: string;
    modelo: string;
    numeroSerie: string | null;
    observaciones: string | null;
    reparaciones: Reparacion[];
    };

    type Cliente = {
    id: string;
    nombre: string;
    telefono: string;
    email: string | null;
    equipos: Equipo[];
    };

    export default function ClienteFichaClient({ id }: { id: string }) {
    const [cliente, setCliente] = useState<Cliente | null>(null);
    const [editando, setEditando] = useState(false);
    const [form, setForm] = useState({ nombre: "", telefono: "", email: "" });
    const [guardando, setGuardando] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        fetch(`/api/clientes/${id}`)
        .then((r) => r.json())
        .then((data: Cliente) => {
            setCliente(data);
            setForm({
            nombre: data.nombre,
            telefono: data.telefono,
            email: data.email ?? "",
            });
        });
    }, [id]);

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setGuardando(true);
        setError(null);

        const res = await fetch(`/api/clientes/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
        });

        if (res.ok) {
        const data = await res.json();
        setCliente((prev) => (prev ? { ...prev, ...data } : prev));
        setEditando(false);
        } else {
        const data = await res.json();
        setError(data.error?._errors?.[0] ?? "No se pudo guardar");
        }
        setGuardando(false);
    }

    if (!cliente) return <p className="text-muted-foreground">Cargando...</p>;

    return (
        <div className="space-y-6">
        <Link href="/clientes" className="text-sm text-primary hover:underline">
            ← Volver a clientes
        </Link>

        <div className="rounded-xl border border-border bg-card p-6 flex items-start justify-between">
            <div>
            <h1 className="text-2xl font-bold">{cliente.nombre}</h1>
            <p className="text-muted-foreground mt-1">
                {cliente.telefono} · {cliente.email ?? "—"}
            </p>
            </div>
            <Button variant="outline" onClick={() => setEditando(true)}>
            Editar
            </Button>
        </div>

        {cliente.equipos.map((equipo) => (
            <div key={equipo.id} className="rounded-xl border border-border bg-card">
            <div className="px-6 py-4 border-b border-border">
                <h2 className="font-semibold text-lg">
                {equipo.tipo} {equipo.marca} {equipo.modelo}
                </h2>
                <p className="text-sm text-muted-foreground mt-1">
                {equipo.numeroSerie ? `S/N ${equipo.numeroSerie} · ` : ""}
                {equipo.observaciones ?? ""}
                </p>
            </div>
            <div className="overflow-x-auto">
                <table className="w-full text-sm">
                <thead>
                    <tr className="border-b border-border text-left text-xs tracking-wide text-muted-foreground uppercase">
                    <th className="px-5 py-3 font-medium">N°</th>
                    <th className="px-5 py-3 font-medium">Estado</th>
                    <th className="px-5 py-3 font-medium">Ingreso</th>
                    <th className="px-5 py-3 font-medium">Entrega</th>
                    <th className="px-5 py-3 font-medium"></th>
                    </tr>
                </thead>
                <tbody>
                    {equipo.reparaciones.map((r) => (
                    <tr key={r.id} className="border-b border-border last:border-0">
                        <td className="px-5 py-3 font-medium">#{r.id.slice(-4)}</td>
                        <td className="px-5 py-3">
                        <StatusBadge estado={r.estado} />
                        </td>
                        <td className="px-5 py-3 text-muted-foreground">
                        {fechaFmt.format(new Date(r.fechaIngreso))}
                        </td>
                        <td className="px-5 py-3 text-muted-foreground">
                        {r.fechaEntrega ? fechaFmt.format(new Date(r.fechaEntrega)) : "—"}
                        </td>
                        <td className="px-5 py-3 text-right">
                        <Link href={`/reparaciones/${r.id}`} className="text-primary hover:underline">
                            Ver →
                        </Link>
                        </td>
                    </tr>
                    ))}
                </tbody>
                </table>
            </div>
            </div>
        ))}

        <Modal open={editando} onClose={() => setEditando(false)} title="Editar cliente">
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div>
                <label className="block text-sm text-muted-foreground mb-1">Nombre</label>
                <input
                value={form.nombre}
                onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
                />
            </div>
            <div>
                <label className="block text-sm text-muted-foreground mb-1">Teléfono</label>
                <input
                value={form.telefono}
                onChange={(e) => setForm({ ...form, telefono: e.target.value })}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
                />
            </div>
            <div>
                <label className="block text-sm text-muted-foreground mb-1">Email</label>
                <input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
                />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <div className="flex justify-end gap-2 mt-2">
                <Button type="button" variant="ghost" onClick={() => setEditando(false)}>
                Cancelar
                </Button>
                <Button type="submit" disabled={guardando}>
                {guardando ? "Guardando..." : "Guardar cambios"}
                </Button>
            </div>
            </form>
        </Modal>
        </div>
    );
    }