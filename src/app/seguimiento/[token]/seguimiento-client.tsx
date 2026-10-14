"use client";

import { useCallback, useEffect, useState } from "react";
import type { EstadoReparacion } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/status-badge";

type Seguimiento = {
  estado: EstadoReparacion;
  montoPresupuesto: string | null;
  mensajePresupuesto: string | null;
  equipo: { tipo: string; marca: string; modelo: string };
  empresa: { nombre: string; logoUrl: string | null; telefono: string | null };
};

export default function SeguimientoClient({ token }: { token: string }) {
  const [data, setData] = useState<Seguimiento | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [respondido, setRespondido] = useState<"APROBADO" | "RECHAZADO" | null>(null);

  const cargar = useCallback(() => {
    fetch(`/api/seguimiento/${token}`)
      .then((r) => {
        if (!r.ok) throw new Error();
        return r.json();
      })
      .then(setData)
      .catch(() => setNotFound(true));
  }, [token]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  async function responder(decision: "APROBADO" | "RECHAZADO") {
    setEnviando(true);
    setError(null);
    const res = await fetch(`/api/seguimiento/${token}/respuesta`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ decision }),
    });
    if (res.ok) {
      setRespondido(decision);
      cargar();
    } else {
      const body: { error?: string } = await res.json().catch(() => ({}));
      setError(body.error ?? "No se pudo registrar la respuesta.");
    }
    setEnviando(false);
  }

  if (notFound) {
    return (
      <div className="flex min-h-screen items-center justify-center p-6">
        <p className="text-muted-foreground">Este link no es válido.</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex min-h-screen items-center justify-center p-6">
        <p className="text-muted-foreground">Cargando...</p>
      </div>
    );
  }

  const puedeResponder = data.estado === "AUTORIZAR" && !respondido;

  return (
    <div className="flex min-h-screen justify-center p-6">
      <div className="w-full max-w-md space-y-6">
        <div className="flex items-center gap-3">
          {data.empresa.logoUrl && (
            // eslint-disable-next-line @next/next/no-img-element -- data URI, no es un asset de Next
            <img src={data.empresa.logoUrl} alt="" className="size-10 rounded-lg object-cover" />
          )}
          <div>
            <p className="font-semibold">{data.empresa.nombre}</p>
            {data.empresa.telefono && (
              <p className="text-xs text-muted-foreground">{data.empresa.telefono}</p>
            )}
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-6 space-y-4">
          <div className="flex items-center justify-between gap-3">
            <h1 className="text-lg font-semibold">
              {data.equipo.tipo} {data.equipo.marca} {data.equipo.modelo}
            </h1>
            <StatusBadge estado={data.estado} />
          </div>

          {data.montoPresupuesto ? (
            <div className="space-y-2 border-t border-border pt-4">
              <p className="text-2xl font-bold">
                ${Number(data.montoPresupuesto).toLocaleString("es-AR")}
              </p>
              {data.mensajePresupuesto && (
                <p className="text-sm whitespace-pre-wrap text-muted-foreground">
                  {data.mensajePresupuesto}
                </p>
              )}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground border-t border-border pt-4">
              Todavía no hay un presupuesto cargado para esta reparación.
            </p>
          )}

          {error && <p className="text-sm text-destructive">{error}</p>}

          {puedeResponder && (
            <div className="flex gap-3 pt-2">
              <Button className="flex-1" onClick={() => responder("APROBADO")} disabled={enviando}>
                Aprobar
              </Button>
              <Button
                className="flex-1"
                variant="outline"
                onClick={() => responder("RECHAZADO")}
                disabled={enviando}
              >
                Rechazar
              </Button>
            </div>
          )}

          {respondido && (
            <p className="text-sm text-muted-foreground pt-2">
              {respondido === "APROBADO"
                ? "Aprobaste el presupuesto. Te vamos a contactar para coordinar."
                : "Rechazaste el presupuesto."}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
