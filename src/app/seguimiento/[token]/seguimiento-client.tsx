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
  // Al rechazar se pide confirmación, con un motivo opcional.
  const [rechazando, setRechazando] = useState(false);
  const [motivo, setMotivo] = useState("");

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
      body: JSON.stringify({
        decision,
        motivo: decision === "RECHAZADO" && motivo.trim() ? motivo.trim() : undefined,
      }),
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

          {puedeResponder && !rechazando && (
            <div className="flex gap-3 pt-2">
              <Button className="flex-1" onClick={() => responder("APROBADO")} disabled={enviando}>
                Aprobar
              </Button>
              <Button
                className="flex-1"
                variant="outline"
                onClick={() => setRechazando(true)}
                disabled={enviando}
              >
                Rechazar
              </Button>
            </div>
          )}

          {puedeResponder && rechazando && (
            <div className="space-y-3 pt-2">
              <label className="block text-sm text-muted-foreground" htmlFor="motivo">
                ¿Querés contarnos por qué? (opcional)
              </label>
              <textarea
                id="motivo"
                value={motivo}
                onChange={(e) => setMotivo(e.target.value)}
                maxLength={500}
                rows={3}
                placeholder="Ej: me parece caro, ¿hay alguna opción más económica?"
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
              />
              <div className="flex gap-3">
                <Button
                  className="flex-1"
                  variant="destructive"
                  onClick={() => responder("RECHAZADO")}
                  disabled={enviando}
                >
                  Confirmar rechazo
                </Button>
                <Button
                  className="flex-1"
                  variant="outline"
                  onClick={() => setRechazando(false)}
                  disabled={enviando}
                >
                  Volver
                </Button>
              </div>
            </div>
          )}

          {respondido && (
            <p className="text-sm text-muted-foreground pt-2">
              {respondido === "APROBADO"
                ? "Aprobaste el presupuesto. Te vamos a contactar para coordinar."
                : "Rechazaste el presupuesto. Si querés otra opción, comunicate con nosotros."}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
