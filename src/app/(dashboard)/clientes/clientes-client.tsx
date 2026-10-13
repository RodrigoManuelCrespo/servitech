"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";

type ClienteRow = {
    id: string;
    nombre: string;
    telefono: string;
    email: string | null;
    cantidadEquipos: number;
};

type FormAltaProps = {
    onCreated: () => void;
    onCancel: () => void;
};

// Formulario de alta. Vive dentro del Modal: al cerrarse se desmonta y,
// al reabrirlo, los campos y el error arrancan limpios.
function FormAlta({ onCreated, onCancel }: FormAltaProps) {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [formData, setFormData] = useState({
        nombre: "",
        telefono: "",
        email: "",
    });

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            const res = await fetch("/api/clientes", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    nombre: formData.nombre,
                    telefono: formData.telefono,
                    email: formData.email || undefined,
                }),
            });

            if (!res.ok) {
                // El backend manda parsed.error.flatten(): { formErrors, fieldErrors }
                const data: {
                    error?: { formErrors?: string[]; fieldErrors?: Record<string, string[]> };
                } = await res.json().catch(() => ({}));
                const flat = data.error;
                setError(
                    flat?.formErrors?.[0] ??
                    Object.values(flat?.fieldErrors ?? {}).flat()[0] ??
                    "No se pudo crear el cliente. Revisá los datos.",
                );
                return;
            }

            onCreated();
        } catch {
            setError("Ocurrió un error inesperado al procesar la solicitud.");
        } finally {
            setLoading(false);
        }
    }

    return (
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div>
                <label className="block text-sm text-muted-foreground mb-1">Nombre</label>
                <input
                    type="text"
                    required
                    placeholder="Ej: Juan Pérez"
                    value={formData.nombre}
                    onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
                />
            </div>

            <div>
                <label className="block text-sm text-muted-foreground mb-1">Teléfono</label>
                <input
                    type="text"
                    required
                    placeholder="Ej: 341 555 1234"
                    value={formData.telefono}
                    onChange={(e) => setFormData({ ...formData, telefono: e.target.value })}
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
                />
            </div>

            <div>
                <label className="block text-sm text-muted-foreground mb-1">Email (opcional)</label>
                <input
                    type="email"
                    placeholder="correo@ejemplo.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
                />
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}

            <div className="flex justify-end gap-2 mt-2">
                <Button type="button" variant="ghost" onClick={onCancel}>
                    Cancelar
                </Button>
                <Button type="submit" disabled={loading}>
                    {loading ? "Creando..." : "Crear cliente"}
                </Button>
            </div>
        </form>
    );
}

export default function ClientesClient() {
    const [search, setSearch] = useState("");
    const [clientes, setClientes] = useState<ClienteRow[] | null>(null);
    const [open, setOpen] = useState(false);

    const cargarClientes = useCallback(async (q: string) => {
        const query = q ? `?search=${encodeURIComponent(q)}` : "";
        const res = await fetch(`/api/clientes${query}`);
        setClientes(await res.json());
    }, []);

    useEffect(() => {
        const timeout = setTimeout(() => {
            cargarClientes(search);
        }, 300);

        return () => clearTimeout(timeout);
    }, [search, cargarClientes]);

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-3xl font-bold">Clientes</h1>
                <Button onClick={() => setOpen(true)}>+ Nuevo cliente</Button>
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
                                    <Button
                                        variant="outline"
                                        nativeButton={false}
                                        render={<Link href={`/clientes/${c.id}`} />}
                                    >
                                        Ver ficha
                                    </Button>
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

            <Modal open={open} onClose={() => setOpen(false)} title="Nuevo cliente">
                <FormAlta
                    onCreated={() => {
                        setOpen(false);
                        cargarClientes(search);
                    }}
                    onCancel={() => setOpen(false)}
                />
            </Modal>
        </div>
    );
}