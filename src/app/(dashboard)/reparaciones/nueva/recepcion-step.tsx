"use client";

import { useState, type ChangeEvent } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  CHECKLIST_ITEMS,
  DEFAULT_CHECKLIST,
  type ChecklistRecepcion,
  type ChecklistValor,
} from "@/lib/checklist";
import { TECNICOS_MOCK } from "./mock-data";

const VALOR_LABEL: Record<ChecklistValor, string> = { SI: "Sí", NO: "No", NA: "N/A" };
const VALORES: ChecklistValor[] = ["SI", "NO", "NA"];

export function RecepcionStep({ equipoId }: { equipoId: string }) {
  const router = useRouter();
  const [checklist, setChecklist] = useState<ChecklistRecepcion>(DEFAULT_CHECKLIST);
  const [fotos, setFotos] = useState<string[]>([]);
  const [tecnicoId, setTecnicoId] = useState("");
  const [diagnostico, setDiagnostico] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleFotoChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setFotos((prev) => [...prev, URL.createObjectURL(file)]);
    e.target.value = "";
  }

  async function handleSubmit() {
    setError(null);
    setSubmitting(true);
    const res = await fetch("/api/reparaciones", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        equipoId,
        checklist,
        tecnicoAsignadoId: tecnicoId || undefined,
        diagnostico: diagnostico || undefined,
      }),
    });
    if (!res.ok) {
      setError("No se pudo registrar la recepción. Revisá los datos.");
      setSubmitting(false);
      return;
    }
    router.push("/");
  }

  const inputClass =
    "w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

  return (
    <section className="space-y-6 rounded-xl border border-border bg-card p-5">
      <div>
        <h2 className="mb-2 text-lg font-semibold">3. Checklist de recepción</h2>
        <div className="divide-y divide-border">
          {CHECKLIST_ITEMS.map((item) => (
            <div key={item.key} className="flex items-center justify-between gap-4 py-3">
              <span className="text-sm">{item.label}</span>
              <div className="flex shrink-0 overflow-hidden rounded-md border border-border">
                {VALORES.map((valor) => (
                  <button
                    key={valor}
                    type="button"
                    onClick={() => setChecklist((prev) => ({ ...prev, [item.key]: valor }))}
                    className={cn(
                      "px-3 py-1.5 text-sm font-medium transition-colors",
                      checklist[item.key] === valor
                        ? "bg-primary text-primary-foreground"
                        : "bg-background text-muted-foreground hover:bg-accent",
                    )}
                  >
                    {VALOR_LABEL[valor]}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div>
        <h2 className="mb-3 text-lg font-semibold">4. Fotos iniciales</h2>
        <div className="flex flex-wrap gap-3">
          {fotos.map((src, i) => (
            // eslint-disable-next-line @next/next/no-img-element -- preview local, nunca se sube
            <img key={i} src={src} alt="" className="size-24 rounded-md border border-border object-cover" />
          ))}
          <label className="flex size-24 cursor-pointer flex-col items-center justify-center rounded-md border border-dashed border-border text-sm text-muted-foreground hover:bg-accent">
            + Foto
            <input type="file" accept="image/*" className="hidden" onChange={handleFotoChange} />
          </label>
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          Vista previa local únicamente — todavía no se suben ni se guardan (falta definir el
          almacenamiento, mismo pendiente que en Configuración de empresa).
        </p>
      </div>

      <div className="space-y-1">
        <label className="text-sm font-medium">Técnico asignado</label>
        <select value={tecnicoId} onChange={(e) => setTecnicoId(e.target.value)} className={inputClass}>
          <option value="">Sin asignar</option>
          {TECNICOS_MOCK.map((t) => (
            <option key={t.id} value={t.id}>
              {t.nombre}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-1">
        <label className="text-sm font-medium">Diagnóstico inicial (opcional)</label>
        <textarea
          value={diagnostico}
          onChange={(e) => setDiagnostico(e.target.value)}
          rows={3}
          placeholder="Observación técnica preliminar..."
          className={inputClass}
        />
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <Button type="button" onClick={handleSubmit} disabled={submitting}>
        {submitting ? "Registrando..." : "Registrar recepción"}
      </Button>
    </section>
  );
}
