// src/app/(dashboard)/configuracion/configuracion-cliente.tsx
"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

type Empresa = {
    id: string;
    nombre: string;
    telefono: string | null;
    email: string | null;
    logoUrl: string | null;
};

const inputClass =
    "w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary";

function LogoSection({ nombre, logoUrl }: { nombre: string; logoUrl: string | null }) {
    const inicial = nombre?.[0]?.toUpperCase() ?? "?";

    return (
        <div>
            <label className="mb-3 block text-sm text-muted-foreground">Logo</label>
            <div className="flex items-center gap-4">
                {logoUrl ? (
                    <img src={logoUrl} alt="Logo" className="h-16 w-16 rounded-lg object-cover" />
                ) : (
                    <div className="flex h-16 w-16 items-center justify-center rounded-lg bg-primary text-2xl font-bold text-primary-foreground">
                        {inicial}
                    </div>
                )}
                <Button
                    type="button"
                    variant="outline"
                    disabled
                    title="Próximamente disponible"
                >
                    Cambiar logo
                </Button>
            </div>
        </div>
    );
}

export default function ConfiguracionCliente() {
    const [empresa, setEmpresa] = useState<Empresa | null>(null);
    const [form, setForm] = useState({ nombre: "", telefono: "", email: "" });
    const [guardando, setGuardando] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        fetch("/api/empresa")
            .then((r) => r.json())
            .then((data: Empresa) => {
                setEmpresa(data);
                setForm({
                    nombre: data.nombre ?? "",
                    telefono: data.telefono ?? "",
                    email: data.email ?? "",
                });
            });
    }, []);

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setGuardando(true);
        setError(null);

        const res = await fetch("/api/empresa", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(form),
        });

        if (res.ok) {
            setEmpresa(await res.json());
        } else {
            const data: {
                error?: { formErrors?: string[]; fieldErrors?: Record<string, string[]> };
            } = await res.json();
            // El backend manda parsed.error.flatten(): { formErrors, fieldErrors }
            // (no tiene _errors, esa forma es de .format()).
            const flat = data.error;
            const mensaje =
                flat?.formErrors?.[0] ??
                Object.values(flat?.fieldErrors ?? {}).flat()[0] ??
                "No se pudo guardar";
            setError(mensaje);
        }
        setGuardando(false);
    }

    if (!empresa) return <p className="text-muted-foreground">Cargando...</p>;

    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-bold">Configuración de empresa</h1>

            <div className="max-w-2xl rounded-xl border border-border bg-card p-8">
                <LogoSection nombre={empresa.nombre} logoUrl={empresa.logoUrl} />

                <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-5">
                    <div>
                        <label className="mb-1 block text-sm text-muted-foreground">Nombre de la empresa</label>
                        <input
                            value={form.nombre}
                            onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                            className={inputClass}
                        />
                    </div>

                    <div>
                        <label className="mb-1 block text-sm text-muted-foreground">Teléfono</label>
                        <input
                            value={form.telefono}
                            onChange={(e) => setForm({ ...form, telefono: e.target.value })}
                            className={inputClass}
                        />
                    </div>

                    <div>
                        <label className="mb-1 block text-sm text-muted-foreground">Email de contacto</label>
                        <input
                            type="email"
                            value={form.email}
                            onChange={(e) => setForm({ ...form, email: e.target.value })}
                            className={inputClass}
                        />
                    </div>

                    {error && <p className="text-sm text-destructive">{error}</p>}

                    <Button type="submit" disabled={guardando} className="w-fit">
                        {guardando ? "Guardando..." : "Guardar cambios"}
                    </Button>
                </form>
            </div>
        </div>
    );
}