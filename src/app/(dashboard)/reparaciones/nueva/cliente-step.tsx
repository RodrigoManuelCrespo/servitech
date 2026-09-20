"use client";

import { useMemo, useState } from "react";
import { CLIENTES_MOCK, type ClienteMock } from "./mock-data";

export function ClienteStep({
  selected,
  onSelect,
  onChange,
}: {
  selected: ClienteMock | null;
  onSelect: (cliente: ClienteMock) => void;
  onChange: () => void;
}) {
  const [query, setQuery] = useState("");

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return CLIENTES_MOCK.filter(
      (c) => c.nombre.toLowerCase().includes(q) || c.telefono.includes(q),
    );
  }, [query]);

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
          ) : (
            <p className="text-sm text-muted-foreground">
              Sin resultados entre los clientes de prueba. (El alta de clientes nuevos es
              parte de otro ticket en curso — por ahora elegí uno de los ya cargados.)
            </p>
          )}
        </div>
      )}
    </section>
  );
}
