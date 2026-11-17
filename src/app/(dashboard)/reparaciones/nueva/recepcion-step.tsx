"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { FotoPicker, type FotoItem } from "@/components/foto-picker";
import { cn } from "@/lib/utils";
import {
  CHECKLIST_ITEMS,
  DEFAULT_CHECKLIST,
  type ChecklistRecepcion,
  type ChecklistValor,
} from "@/lib/checklist";

const VALOR_LABEL: Record<ChecklistValor, string> = { SI: "Sí", NO: "No", NA: "N/A" };
const VALORES: ChecklistValor[] = ["SI", "NO", "NA"];

type Tecnico = { id: string; nombre: string };

export function RecepcionStep({ equipoId }: { equipoId: string }) {
  const router = useRouter();
  const [checklist, setChecklist] = useState<ChecklistRecepcion>(DEFAULT_CHECKLIST);
  // Ya comprimidas; se mandan junto con la recepción.
  const [fotos, setFotos] = useState<FotoItem[]>([]);
  const [tecnicos, setTecnicos] = useState<Tecnico[]>([]);
  const [tecnicoId, setTecnicoId] = useState("");
  const [fallaReportada, setFallaReportada] = useState("");
  const [diagnostico, setDiagnostico] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/usuarios")
      .then((res) => (res.ok ? res.json() : []))
      .then((usuarios: { id: string; nombre: string; rol: string; activo: boolean }[]) => {
        setTecnicos(usuarios.filter((u) => u.rol === "TECNICO" && u.activo));
      });
  }, []);


  async function handleSubmit() {
    setError(null);
    setSubmitting(true);
    const res = await fetch("/api/reparaciones", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        equipoId,
        fallaReportada,
        checklist,
        tecnicoAsignadoId: tecnicoId || undefined,
        diagnostico: diagnostico || undefined,
        fotos: fotos.map((f) => f.src),
      }),
    });
    if (!res.ok) {
      const data: { error?: string } = await res.json().catch(() => ({}));
      setError(data.error ?? "No se pudo registrar la recepción. Revisá los datos.");
      setSubmitting(false);
      return;
    }
    // Si la orden salió por email, vuelve al Dashboard como siempre. Si no
    // (cliente sin email o falla del envío), va al detalle para que el admin
    // la descargue e imprima.
    const data: { id: string; email: "ENVIADO" | "ERROR" | "SIN_EMAIL" } = await res.json();
    if (data.email === "ENVIADO") {
      router.push("/");
    } else {
      router.push(`/reparaciones/${data.id}?orden=${data.email === "SIN_EMAIL" ? "sin-email" : "error"}`);
    }
  }

  const inputClass =
    "w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

  return (
    <section className="space-y-6 rounded-xl border border-border bg-card p-5">
      <div className="space-y-1">
        <h2 className="mb-2 text-lg font-semibold">3. Falla reportada</h2>
        <label className="text-sm font-medium">
          ¿Qué le pasa al equipo según el cliente? <span className="text-destructive">*</span>
        </label>
        <textarea
          value={fallaReportada}
          onChange={(e) => setFallaReportada(e.target.value)}
          rows={3}
          placeholder="Ej: no enciende desde que se mojó; la pantalla parpadea..."
          className={inputClass}
        />
        <p className="text-xs text-muted-foreground">
          Va impresa en la orden de recepción que se le entrega al cliente.
        </p>
      </div>

      <div>
        <h2 className="mb-2 text-lg font-semibold">4. Checklist de recepción</h2>
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
        <h2 className="mb-3 text-lg font-semibold">5. Fotos iniciales</h2>
        <FotoPicker
          fotos={fotos}
          onAgregar={(src) =>
            setFotos((prev) => [...prev, { key: crypto.randomUUID(), src }])
          }
          onQuitar={(key) => setFotos((prev) => prev.filter((f) => f.key !== key))}
        />
      </div>

      <div className="space-y-1">
        <label className="text-sm font-medium">Técnico asignado</label>
        <select value={tecnicoId} onChange={(e) => setTecnicoId(e.target.value)} className={inputClass}>
          <option value="">Sin asignar</option>
          {tecnicos.map((t) => (
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

      <Button
        type="button"
        onClick={handleSubmit}
        disabled={submitting || fallaReportada.trim().length < 3}
      >
        {submitting ? "Registrando..." : "Registrar recepción"}
      </Button>
    </section>
  );
}
