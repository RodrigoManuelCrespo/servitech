"use client";

import type { ChangeEvent } from "react";

// Selector de fotos con preview local (URL.createObjectURL). No sube ni
// persiste nada todavía — falta definir el storage (mismo pendiente que
// el logo de empresa en Configuración). Compartido entre Nueva Recepción
// y el detalle de una Reparación.
export function FotoPicker({
  fotos,
  onAdd,
}: {
  fotos: string[];
  onAdd: (url: string) => void;
}) {
  function handleChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    onAdd(URL.createObjectURL(file));
    e.target.value = "";
  }

  return (
    <div className="flex flex-wrap gap-3">
      {fotos.map((src, i) => (
        // eslint-disable-next-line @next/next/no-img-element -- preview local, nunca se sube
        <img key={i} src={src} alt="" className="size-24 rounded-md border border-border object-cover" />
      ))}
      <label className="flex size-24 cursor-pointer flex-col items-center justify-center rounded-md border border-dashed border-border text-sm text-muted-foreground hover:bg-accent">
        + Foto
        <input type="file" accept="image/*" className="hidden" onChange={handleChange} />
      </label>
    </div>
  );
}
