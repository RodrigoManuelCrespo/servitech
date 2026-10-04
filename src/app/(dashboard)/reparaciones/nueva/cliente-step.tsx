"use client";

import { useEffect, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";

export type ClienteResumen = {
  id: string;
  nombre: string;
  telefono: string;
  email: string | null;
};

export function ClienteStep({
  selected,
  onSelect,
  onChange,
}: {
  selected: ClienteResumen | null;
  onSelect: (cliente: ClienteResumen) => void;
  onChange: () => void;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<ClienteResumen[]>([]);
  const [searched, setSearched] = useState(false);
  const [pending, startTransition] = useTransition();

  const [nombre, setNombre] = useState("");
  const [telefono, setTelefono] = useState("");
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (selected) return;
    const q = query.trim();
    if (!q) {
      setResults([]);
      setSearched(false);
      return;
    }
    const timeout = setTimeout(() => {
      startTransition(async () => {
        const res = await fetch(`/api/clientes?search=${encodeURIComponent(q)}`);
        const data: ClienteResumen[] = res.ok ? await res.json() : [];
        setResults(data);
        setSearched(true);
      });
    }, 300);
    return () => clearTimeout(timeout);
  }, [query, selected]);

  async function handleCrear() {
    setError(null);
    if (nombre.trim().length < 1 || telefono.trim().length < 1) {
      setError("Completá nombre y teléfono.");
      return;
    }
    const res = await fetch("/api/clientes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nombre, telefono, email: email || undefined }),
    });
    if (!res.ok) {
      setError("No se pudo crear el cliente. Revisá los datos.");
      return;
    }
    onSelect(await res.json());
  }

  const inputClass =
    "w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

  if (selected) {
    return (
      <section className="rounded-xl border border-border bg-card p-5">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">1. Cliente</h2>
          <button
            type="button"
            onClick={onChange}
            className="text-sm text-primary hover:underline"
          >
            Cambiar
          </button>
        </div>
        <p className="mt-3 font-medium">{selected.nombre}</p>
        <p className="text-sm text-muted-foreground">{selected.telefono}</p>
      </section>
    );
  }

  return (
    <section className="rounded-xl border border-border bg-card p-5">
      <h2 className="mb-3 text-lg font-semibold">1. Cliente</h2>
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Buscar por nombre o teléfono..."
        className={inputClass}
      />

      {query.trim() && (
        <div className="mt-3">
          {results.length > 0 ? (
            <ul className="divide-y divide-border overflow-hidden rounded-md border border-border">
              {results.map((cliente) => (
                <li key={cliente.id}>
                  <button
                    type="button"
                    onClick={() => onSelect(cliente)}
                    className="flex w-full flex-col items-start px-3 py-2 text-left text-sm hover:bg-accent"
                  >
                    <span className="font-medium">{cliente.nombre}</span>
                    <span className="text-muted-foreground">{cliente.telefono}</span>
                  </button>
                </li>
              ))}
            </ul>
          ) : searched && !pending ? (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Sin resultados. Completá los datos para crear uno nuevo:
              </p>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1">
                  <label className="text-sm font-medium">Nombre</label>
                  <input value={nombre} onChange={(e) => setNombre(e.target.value)} className={inputClass} />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium">Teléfono</label>
                  <input value={telefono} onChange={(e) => setTelefono(e.target.value)} className={inputClass} />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">Email (opcional)</label>
                <input value={email} onChange={(e) => setEmail(e.target.value)} className={inputClass} />
              </div>
              {error && <p className="text-sm text-destructive">{error}</p>}
              <Button type="button" onClick={handleCrear}>
                Crear cliente
              </Button>
            </div>
          ) : pending ? (
            <p className="text-sm text-muted-foreground">Buscando...</p>
          ) : null}
        </div>
      )}
    </section>
  );
}
