"use client";

import { useState, type ChangeEvent } from "react";
import { comprimirImagen } from "@/lib/comprimir-imagen";
import { MAX_FOTOS } from "@/lib/fotos";

export type FotoItem = {
  key: string;
  src: string;
  // Si está, la miniatura abre la foto en grande (solo fotos ya guardadas:
  // el navegador no deja abrir un data URI en otra pestaña).
  href?: string;
};

// Selector de fotos compartido entre Nueva Recepción y el detalle de una
// reparación. Comprime cada foto en el navegador y le pasa el data URI al
// padre, que decide si la guarda al momento o junto con el formulario.
export function FotoPicker({
  fotos,
  onAgregar,
  onQuitar,
  deshabilitado = false,
}: {
  fotos: FotoItem[];
  onAgregar: (dataUri: string) => Promise<void> | void;
  onQuitar?: (key: string) => Promise<void> | void;
  deshabilitado?: boolean;
}) {
  const [procesando, setProcesando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const quedan = MAX_FOTOS - fotos.length;

  async function handleChange(e: ChangeEvent<HTMLInputElement>) {
    const elegidas = Array.from(e.target.files ?? []);
    e.target.value = "";
    if (elegidas.length === 0) return;

    setError(null);
    setProcesando(true);
    try {
      for (const archivo of elegidas.slice(0, quedan)) {
        await onAgregar(await comprimirImagen(archivo));
      }
      if (elegidas.length > quedan) {
        setError(`Se pueden cargar hasta ${MAX_FOTOS} fotos: se agregaron solo ${quedan}.`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo agregar la foto.");
    } finally {
      setProcesando(false);
    }
  }

  async function handleQuitar(key: string) {
    setError(null);
    try {
      await onQuitar?.(key);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo quitar la foto.");
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-3">
        {fotos.map((foto) => (
          <div key={foto.key} className="relative">
            {foto.href ? (
              <a href={foto.href} target="_blank" rel="noopener noreferrer" title="Ver en grande">
                {/* eslint-disable-next-line @next/next/no-img-element -- imagen servida por la API, no un asset de Next */}
                <img src={foto.src} alt="" className="size-24 rounded-md border border-border object-cover" />
              </a>
            ) : (
              // eslint-disable-next-line @next/next/no-img-element -- vista previa (data URI) antes de guardar
              <img src={foto.src} alt="" className="size-24 rounded-md border border-border object-cover" />
            )}
            {onQuitar && !deshabilitado && (
              <button
                type="button"
                onClick={() => handleQuitar(foto.key)}
                aria-label="Quitar foto"
                className="absolute -top-2 -right-2 flex size-6 items-center justify-center rounded-full border border-border bg-card text-xs text-muted-foreground hover:text-destructive"
              >
                ✕
              </button>
            )}
          </div>
        ))}
        {!deshabilitado && quedan > 0 && (
          <label
            className={`flex size-24 flex-col items-center justify-center rounded-md border border-dashed border-border text-sm text-muted-foreground ${
              procesando ? "cursor-wait opacity-60" : "cursor-pointer hover:bg-accent"
            }`}
          >
            {procesando ? "Subiendo..." : "+ Foto"}
            <input
              type="file"
              accept="image/*"
              multiple
              disabled={procesando}
              className="hidden"
              onChange={handleChange}
            />
          </label>
        )}
      </div>
      <p className="text-xs text-muted-foreground">
        {fotos.length}/{MAX_FOTOS} fotos
        {deshabilitado && " · La reparación ya fue entregada."}
      </p>
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
