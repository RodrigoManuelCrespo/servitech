// src/app/(dashboard)/configuracion/configuracion-cliente.tsx
"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";

type Empresa = {
    id: string;
    nombre: string;
    telefono: string | null;
    email: string | null;
    logoUrl: string | null;
};

const TIPOS_LOGO = ["image/png", "image/jpeg", "image/webp"];
const MAX_LOGO_BYTES = 500 * 1024;

const inputClass =
    "w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

function LogoSection({
    nombre,
    logoUrl,
    pendiente,
    onPick,
}: {
    nombre: string;
    logoUrl: string | null;
    pendiente: boolean;
    onPick: (dataUrl: string) => void;
}) {
    const inputRef = useRef<HTMLInputElement>(null);
    const [error, setError] = useState<string | null>(null);
    const inicial = nombre?.[0]?.toUpperCase() ?? "?";

    function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0];
        e.target.value = ""; // permite volver a elegir el mismo archivo
        if (!file) return;

        setError(null);
        if (!TIPOS_LOGO.includes(file.type)) {
            setError("Formato no permitido. Usá PNG, JPG o WebP.");
            return;
        }
        if (file.size > MAX_LOGO_BYTES) {
            setError("El logo pesa más de 500 KB.");
            return;
        }

        const reader = new FileReader();
        reader.onload = () => onPick(reader.result as string);
        reader.onerror = () => setError("No se pudo leer el archivo.");
        reader.readAsDataURL(file);
    }

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
                <div className="space-y-1">
                    <input
                        ref={inputRef}
                        type="file"
                        accept="image/png,image/jpeg,image/webp"
                        onChange={handleFile}
                        className="hidden"
                    />
                    <Button type="button" variant="outline" onClick={() => inputRef.current?.click()}>
                        {logoUrl ? "Cambiar logo" : "+ Logo"}
                    </Button>
                    <p className="text-xs text-muted-foreground">
                        {pendiente
                            ? "Logo nuevo seleccionado: apretá “Guardar cambios” para confirmarlo."
                            : "PNG, JPG o WebP, hasta 500 KB."}
                    </p>
                </div>
            </div>
            {error && <p className="mt-2 text-sm text-destructive">{error}</p>}
        </div>
    );
}

export default function ConfiguracionCliente() {
    const [empresa, setEmpresa] = useState<Empresa | null>(null);
    const [form, setForm] = useState({ nombre: "", telefono: "", email: "" });
    const [nuevoLogo, setNuevoLogo] = useState<string | null>(null);
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
            body: JSON.stringify(nuevoLogo ? { ...form, logoUrl: nuevoLogo } : form),
        });

        if (res.ok) {
            const data = await res.json();
            // El PATCH no devuelve el logo: se conserva el anterior o el recién guardado.
            setEmpresa((prev) =>
                prev ? { ...prev, ...data, logoUrl: nuevoLogo ?? prev.logoUrl } : data,
            );
            setNuevoLogo(null);
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
                <LogoSection
                    nombre={form.nombre || empresa.nombre}
                    logoUrl={nuevoLogo ?? empresa.logoUrl}
                    pendiente={nuevoLogo !== null}
                    onPick={setNuevoLogo}
                />

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