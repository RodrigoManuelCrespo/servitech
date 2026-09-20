// src/app/(dashboard)/configuracion/configuracion-cliente.tsx
"use client";

import { useEffect, useState } from "react";

    type Empresa = {
    id: string;
    nombre: string;
    telefono: string | null;
    email: string | null;
    logoUrl: string | null;
    };

    function LogoSection({ nombre, logoUrl }: { nombre: string; logoUrl: string | null }) {
    const inicial = nombre?.[0]?.toUpperCase() ?? "?";

    return (
        <div>
        <label className="block text-sm text-slate-300 mb-3">Logo</label>
        <div className="flex gap-4 items-center">
            {logoUrl ? (
            <img src={logoUrl} alt="Logo" className="w-16 h-16 rounded-lg object-cover" />
            ) : (
            <div className="w-16 h-16 rounded-lg bg-blue-500 flex items-center justify-center text-2xl font-bold text-slate-900">
                {inicial}
            </div>
            )}
            <button
            type="button"
            disabled
            title="Próximamente disponible"
            className="bg-slate-800 text-slate-300 rounded-lg px-5 py-2.5 text-sm opacity-60 cursor-not-allowed"
            >
            Cambiar logo
            </button>
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
        const data = await res.json();
        setError(data.error?._errors?.[0] ?? "No se pudo guardar");
        }
        setGuardando(false);
    }

    if (!empresa) return <p className="text-slate-400 p-8">Cargando...</p>;

    return (
        <div className="p-8">
        <div className="flex justify-between items-center mb-6">
            <h1 className="text-3xl font-bold text-white">Configuración de empresa</h1>
            <span className="text-sm font-semibold text-blue-400 border border-blue-400 rounded-full px-4 py-1.5">
            Solo ADMIN
            </span>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-8 max-w-2xl">
            <LogoSection nombre={empresa.nombre} logoUrl={empresa.logoUrl} />

            <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-5">
            <div>
                <label className="block text-sm text-slate-300 mb-2">Nombre de la empresa</label>
                <input
                value={form.nombre}
                onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-3 text-white outline-none focus:border-blue-500"
                />
            </div>

            <div>
                <label className="block text-sm text-slate-300 mb-2">Teléfono</label>
                <input
                value={form.telefono}
                onChange={(e) => setForm({ ...form, telefono: e.target.value })}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-3 text-white outline-none focus:border-blue-500"
                />
            </div>

            <div>
                <label className="block text-sm text-slate-300 mb-2">Email de contacto</label>
                <input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-3 text-white outline-none focus:border-blue-500"
                />
            </div>

            {error && <p className="text-red-400 text-sm">{error}</p>}

            <button
                type="submit"
                disabled={guardando}
                className="w-fit bg-blue-500 hover:bg-blue-600 disabled:opacity-50 text-slate-900 font-semibold rounded-lg px-6 py-3 transition-colors"
            >
                {guardando ? "Guardando..." : "Guardar cambios"}
            </button>
            </form>
        </div>
        </div>
    );
    }