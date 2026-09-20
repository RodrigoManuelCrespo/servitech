"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { EQUIPO_TIPOS } from "@/lib/equipo-tipos";

export type EquipoResumen = {
  id: string;
  tipo: string;
  marca: string;
  modelo: string;
  numeroSerie: string | null;
};

export function EquipoStep({
  clienteId,
  selected,
  onSelect,
  onChange,
}: {
  clienteId: string;
  selected: EquipoResumen | null;
  onSelect: (equipo: EquipoResumen) => void;
  onChange: () => void;
}) {
  const [equipos, setEquipos] = useState<EquipoResumen[]>([]);
  const [loading, setLoading] = useState(true);

  const [tipo, setTipo] = useState("");
  const [marca, setMarca] = useState("");
  const [modelo, setModelo] = useState("");
  const [numeroSerie, setNumeroSerie] = useState("");
  const [observaciones, setObservaciones] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (selected) return;
    setLoading(true);
    fetch(`/api/equipos?clienteId=${encodeURIComponent(clienteId)}`)
      .then((res) => res.json())
      .then(setEquipos)
      .finally(() => setLoading(false));
  }, [clienteId, selected]);

  async function handleCrear() {
    setError(null);
    if (!tipo || !marca.trim() || !modelo.trim()) {
      setError("Completá tipo, marca y modelo.");
      return;
    }
    const res = await fetch("/api/equipos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        clienteId,
        tipo,
        marca,
        modelo,
        numeroSerie: numeroSerie || undefined,
        observaciones: observaciones || undefined,
      }),
    });
    if (!res.ok) {
      setError("No se pudo agregar el equipo.");
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
          <h2 className="text-lg font-semibold">2. Equipo</h2>
          <button
            type="button"
            onClick={onChange}
            className="text-sm text-primary hover:underline"
          >
            Cambiar
          </button>
        </div>
        <p className="mt-3 font-medium">
          {selected.tipo} {selected.marca} {selected.modelo}
          {selected.numeroSerie ? ` — S/N ${selected.numeroSerie}` : ""}
        </p>
      </section>
    );
  }

  return (
    <section className="rounded-xl border border-border bg-card p-5">
      <h2 className="mb-3 text-lg font-semibold">2. Equipo</h2>

      {loading ? (
        <p className="text-sm text-muted-foreground">Cargando equipos del cliente...</p>
      ) : equipos.length > 0 ? (
        <div className="mb-4 space-y-2">
          {equipos.map((equipo) => (
            <button
              key={equipo.id}
              type="button"
              onClick={() => onSelect(equipo)}
              className="w-full rounded-md border border-border bg-secondary px-3 py-2.5 text-left text-sm font-medium hover:bg-accent"
            >
              {equipo.tipo} {equipo.marca} {equipo.modelo}
              {equipo.numeroSerie ? ` — S/N ${equipo.numeroSerie}` : ""}
            </button>
          ))}
        </div>
      ) : (
        <p className="mb-4 text-sm text-muted-foreground">
          Este cliente todavía no tiene equipos cargados.
        </p>
      )}

      <div className="border-t border-border pt-4">
        <p className="mb-3 text-sm text-muted-foreground">Agregar equipo nuevo:</p>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1">
            <label className="text-sm font-medium">Tipo</label>
            <select value={tipo} onChange={(e) => setTipo(e.target.value)} className={inputClass}>
              <option value="">Seleccionar...</option>
              {EQUIPO_TIPOS.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium">Marca</label>
            <input value={marca} onChange={(e) => setMarca(e.target.value)} className={inputClass} />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium">Modelo</label>
            <input value={modelo} onChange={(e) => setModelo(e.target.value)} className={inputClass} />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium">N° de serie (opcional)</label>
            <input value={numeroSerie} onChange={(e) => setNumeroSerie(e.target.value)} className={inputClass} />
          </div>
        </div>
        <div className="mt-3 space-y-1">
          <label className="text-sm font-medium">Observaciones</label>
          <textarea
            value={observaciones}
            onChange={(e) => setObservaciones(e.target.value)}
            rows={3}
            className={inputClass}
          />
        </div>
        {error && <p className="mt-2 text-sm text-destructive">{error}</p>}
        <Button type="button" onClick={handleCrear} className="mt-3">
          Agregar equipo
        </Button>
      </div>
    </section>
  );
}
