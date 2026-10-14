"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import type { EstadoReparacion, Rol } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { FotoPicker } from "@/components/foto-picker";
import { StatusBadge } from "@/components/status-badge";
import { ESTADO_META, TRANSICIONES_VALIDAS } from "@/lib/estado";
import { CHECKLIST_ITEMS, type ChecklistRecepcion } from "@/lib/checklist";
import { cn } from "@/lib/utils";

type Detalle = {
  id: string;
  estado: EstadoReparacion;
  diagnostico: string | null;
  checklist: ChecklistRecepcion | null;
  fechaIngreso: string;
  fechaEntrega: string | null;
  tecnicoAsignadoId: string | null;
  montoPresupuesto: string | null;
  mensajePresupuesto: string | null;
  linkToken: string | null;
  equipo: {
    tipo: string;
    marca: string;
    modelo: string;
    numeroSerie: string | null;
    observaciones: string | null;
    cliente: { id: string; nombre: string; telefono: string; email: string | null };
  };
  tecnicoAsignado: { id: string; nombre: string } | null;
  historialEstados: {
    id: string;
    estadoAnterior: EstadoReparacion | null;
    estadoNuevo: EstadoReparacion;
    fecha: string;
    comentario: string | null;
    usuario: { nombre: string } | null;
  }[];
  documentosGenerados: {
    id: string;
    tipoDocumento: string;
    canalEnvio: "EMAIL" | "WHATSAPP_MOCK";
    estadoEnvio: "ENVIADO" | "SIMULADO" | "ERROR";
    fechaEnvio: string;
    url: string | null;
  }[];
  fotos: { id: string; url: string; descripcion: string | null }[];
};

type Tecnico = { id: string; nombre: string };

const fechaHoraFmt = new Intl.DateTimeFormat("es-AR", { dateStyle: "short", timeStyle: "short" });

const checklistLabel: Record<"SI" | "NO" | "NA", string> = { SI: "Sí", NO: "No", NA: "N/A" };
const checklistPill: Record<"SI" | "NO" | "NA", string> = {
  SI: "border border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  NO: "border border-destructive/30 bg-destructive/10 text-destructive",
  NA: "border border-border text-muted-foreground",
};

const documentoEnvioPill: Record<"ENVIADO" | "SIMULADO" | "ERROR", string> = {
  ENVIADO: "border border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  SIMULADO: "border border-border text-muted-foreground",
  ERROR: "border border-destructive/30 bg-destructive/10 text-destructive",
};
const documentoEnvioLabel: Record<"ENVIADO" | "SIMULADO" | "ERROR", string> = {
  ENVIADO: "Enviado",
  SIMULADO: "Simulado",
  ERROR: "Error",
};
const documentoTipoLabel: Record<string, string> = {
  ORDEN_PDF: "Orden de reparación",
  PRESUPUESTO: "Presupuesto",
};

const inputClass =
  "w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary";

export default function DetalleClient({ id, rol }: { id: string; rol: Rol }) {
  const [detalle, setDetalle] = useState<Detalle | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [tecnicos, setTecnicos] = useState<Tecnico[]>([]);

  // Cambiar estado
  const [formEstado, setFormEstado] = useState("");
  const [formComentario, setFormComentario] = useState("");
  const [cambiandoEstado, setCambiandoEstado] = useState(false);
  const [estadoError, setEstadoError] = useState<string | null>(null);

  // Reasignar técnico
  const [editandoTecnico, setEditandoTecnico] = useState(false);
  const [formTecnicoId, setFormTecnicoId] = useState("");
  const [guardandoTecnico, setGuardandoTecnico] = useState(false);
  const [tecnicoError, setTecnicoError] = useState<string | null>(null);

  // Diagnóstico
  const [editandoDiagnostico, setEditandoDiagnostico] = useState(false);
  const [formDiagnostico, setFormDiagnostico] = useState("");
  const [guardandoDiagnostico, setGuardandoDiagnostico] = useState(false);

  const [generando, setGenerando] = useState(false);

  // Presupuesto (admin-only)
  const [editandoPresupuesto, setEditandoPresupuesto] = useState(false);
  const [formMonto, setFormMonto] = useState("");
  const [formMensaje, setFormMensaje] = useState("");
  const [guardandoPresupuesto, setGuardandoPresupuesto] = useState(false);
  const [presupuestoError, setPresupuestoError] = useState<string | null>(null);
  const [enviandoPresupuesto, setEnviandoPresupuesto] = useState(false);

  // Igual que en Nueva Recepción: preview local únicamente, no se sube ni
  // se persiste todavía (falta definir el storage).
  const [fotosPreview, setFotosPreview] = useState<string[]>([]);

  const cargar = useCallback(() => {
    fetch(`/api/reparaciones/${id}`)
      .then((r) => {
        if (!r.ok) throw new Error();
        return r.json();
      })
      .then((data: Detalle) => {
        setDetalle(data);
        setFormEstado("");
        setFormComentario("");
        setFormTecnicoId(data.tecnicoAsignadoId ?? "");
        setFormDiagnostico(data.diagnostico ?? "");
        setFormMonto(data.montoPresupuesto ?? "");
        setFormMensaje(data.mensajePresupuesto ?? "");
        setEditandoTecnico(false);
        setEditandoDiagnostico(false);
        setEditandoPresupuesto(false);
      })
      .catch(() => setNotFound(true));
  }, [id]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  useEffect(() => {
    if (rol !== "ADMIN") return;
    fetch("/api/usuarios")
      .then((res) => (res.ok ? res.json() : []))
      .then((usuarios: { id: string; nombre: string; rol: string; activo: boolean }[]) => {
        setTecnicos(usuarios.filter((u) => u.rol === "TECNICO" && u.activo));
      });
  }, [rol]);

  async function handleCambiarEstado() {
    if (!formEstado) return;
    setCambiandoEstado(true);
    setEstadoError(null);
    const res = await fetch(`/api/reparaciones/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ estado: formEstado, comentario: formComentario || undefined }),
    });
    if (res.ok) {
      cargar();
    } else {
      const data: { error?: string } = await res.json().catch(() => ({}));
      setEstadoError(data.error ?? "No se pudo cambiar el estado.");
    }
    setCambiandoEstado(false);
  }

  async function handleGuardarTecnico() {
    if (!detalle) return;
    setGuardandoTecnico(true);
    setTecnicoError(null);
    const res = await fetch(`/api/reparaciones/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tecnicoAsignadoId: formTecnicoId || null }),
    });
    if (res.ok) {
      cargar();
    } else {
      const data: { error?: string } = await res.json().catch(() => ({}));
      setTecnicoError(data.error ?? "No se pudo reasignar.");
    }
    setGuardandoTecnico(false);
  }

  async function handleGuardarDiagnostico() {
    setGuardandoDiagnostico(true);
    const res = await fetch(`/api/reparaciones/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ diagnostico: formDiagnostico }),
    });
    if (res.ok) cargar();
    setGuardandoDiagnostico(false);
  }

  async function handleGenerarOrden() {
    setGenerando(true);
    const res = await fetch(`/api/reparaciones/${id}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    if (res.ok) cargar();
    setGenerando(false);
  }

  async function handleGuardarPresupuesto() {
    setGuardandoPresupuesto(true);
    setPresupuestoError(null);
    const res = await fetch(`/api/reparaciones/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        montoPresupuesto: formMonto === "" ? null : Number(formMonto),
        mensajePresupuesto: formMensaje,
      }),
    });
    if (res.ok) {
      cargar();
    } else {
      const data: { error?: string } = await res.json().catch(() => ({}));
      setPresupuestoError(data.error ?? "No se pudo guardar el presupuesto.");
    }
    setGuardandoPresupuesto(false);
  }

  async function handleEnviarPresupuesto() {
    setEnviandoPresupuesto(true);
    setPresupuestoError(null);
    const res = await fetch(`/api/reparaciones/${id}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tipoDocumento: "PRESUPUESTO" }),
    });
    if (res.ok) {
      cargar();
    } else {
      const data: { error?: string } = await res.json().catch(() => ({}));
      setPresupuestoError(data.error ?? "No se pudo enviar el presupuesto.");
    }
    setEnviandoPresupuesto(false);
  }

  if (notFound) {
    return <p className="text-sm text-destructive">No se encontró la reparación.</p>;
  }
  if (!detalle) {
    return <p className="text-muted-foreground">Cargando...</p>;
  }

  const transicionesPosibles = TRANSICIONES_VALIDAS[detalle.estado];
  const checklistItems = detalle.checklist;

  return (
    <div className="space-y-6">
      <Button variant="outline" nativeButton={false} render={<Link href="/reparaciones" />}>
        Volver a reparaciones
      </Button>

      <div className="rounded-xl border border-border bg-card p-6">
        <div className="flex items-center gap-3 flex-wrap">
          <h1 className="text-2xl font-bold">Reparación r{detalle.id.slice(-4)}</h1>
          <StatusBadge estado={detalle.estado} />
        </div>
        <p className="text-muted-foreground mt-1">
          {detalle.equipo.cliente.nombre} · {detalle.equipo.tipo} {detalle.equipo.marca}{" "}
          {detalle.equipo.modelo} · Técnico: {detalle.tecnicoAsignado?.nombre ?? "Sin asignar"}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Columna principal */}
        <div className="lg:col-span-2 space-y-6">
          <div className="rounded-xl border border-border bg-card p-6 space-y-3">
            <h2 className="font-semibold">Cambiar estado</h2>
            {transicionesPosibles.length > 0 ? (
              <>
                <select
                  value={formEstado}
                  onChange={(e) => setFormEstado(e.target.value)}
                  className={inputClass}
                >
                  <option value="">Seleccionar nuevo estado</option>
                  {transicionesPosibles.map((e) => (
                    <option key={e} value={e}>
                      {ESTADO_META[e].label}
                    </option>
                  ))}
                </select>
                {formEstado && (
                  <textarea
                    value={formComentario}
                    onChange={(ev) => setFormComentario(ev.target.value)}
                    placeholder="Comentario (opcional)"
                    rows={2}
                    className={inputClass}
                  />
                )}
                {estadoError && <p className="text-sm text-destructive">{estadoError}</p>}
                <Button onClick={handleCambiarEstado} disabled={!formEstado || cambiandoEstado}>
                  {cambiandoEstado ? "Guardando..." : "Confirmar cambio"}
                </Button>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">Estado final, sin más transiciones.</p>
            )}
          </div>

          <div className="rounded-xl border border-border bg-card p-6 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold">Técnico asignado</h2>
              {rol === "ADMIN" && !editandoTecnico && (
                <button
                  type="button"
                  onClick={() => setEditandoTecnico(true)}
                  className="text-sm text-primary hover:underline"
                >
                  Reasignar
                </button>
              )}
            </div>
            {!editandoTecnico ? (
              <p>{detalle.tecnicoAsignado?.nombre ?? "Sin asignar"}</p>
            ) : (
              <div className="space-y-3">
                <select
                  value={formTecnicoId}
                  onChange={(e) => setFormTecnicoId(e.target.value)}
                  className={inputClass}
                >
                  <option value="">Sin asignar</option>
                  {tecnicos.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.nombre}
                    </option>
                  ))}
                </select>
                {tecnicoError && <p className="text-sm text-destructive">{tecnicoError}</p>}
                <div className="flex gap-2">
                  <Button size="sm" onClick={handleGuardarTecnico} disabled={guardandoTecnico}>
                    {guardandoTecnico ? "Guardando..." : "Guardar"}
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      setEditandoTecnico(false);
                      setFormTecnicoId(detalle.tecnicoAsignadoId ?? "");
                      setTecnicoError(null);
                    }}
                  >
                    Cancelar
                  </Button>
                </div>
              </div>
            )}
          </div>

          <div className="rounded-xl border border-border bg-card p-6 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold">Diagnóstico</h2>
              {!editandoDiagnostico && (
                <button
                  type="button"
                  onClick={() => setEditandoDiagnostico(true)}
                  className="text-sm text-primary hover:underline"
                >
                  Editar
                </button>
              )}
            </div>
            {!editandoDiagnostico ? (
              <p className="text-sm whitespace-pre-wrap">
                {detalle.diagnostico || <span className="text-muted-foreground">Sin diagnóstico cargado.</span>}
              </p>
            ) : (
              <div className="space-y-3">
                <textarea
                  value={formDiagnostico}
                  onChange={(e) => setFormDiagnostico(e.target.value)}
                  rows={3}
                  className={inputClass}
                />
                <div className="flex gap-2">
                  <Button size="sm" onClick={handleGuardarDiagnostico} disabled={guardandoDiagnostico}>
                    {guardandoDiagnostico ? "Guardando..." : "Guardar"}
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      setEditandoDiagnostico(false);
                      setFormDiagnostico(detalle.diagnostico ?? "");
                    }}
                  >
                    Cancelar
                  </Button>
                </div>
              </div>
            )}
          </div>

          {rol === "ADMIN" && (
            <div className="rounded-xl border border-border bg-card p-6 space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="font-semibold">Presupuesto</h2>
                {!editandoPresupuesto && (
                  <button
                    type="button"
                    onClick={() => setEditandoPresupuesto(true)}
                    className="text-sm text-primary hover:underline"
                  >
                    {detalle.montoPresupuesto ? "Editar" : "Cargar"}
                  </button>
                )}
              </div>

              {!editandoPresupuesto ? (
                <>
                  {detalle.montoPresupuesto ? (
                    <div className="space-y-1">
                      <p className="text-lg font-semibold">
                        ${Number(detalle.montoPresupuesto).toLocaleString("es-AR")}
                      </p>
                      {detalle.mensajePresupuesto && (
                        <p className="text-sm whitespace-pre-wrap text-muted-foreground">
                          {detalle.mensajePresupuesto}
                        </p>
                      )}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">Sin presupuesto cargado.</p>
                  )}
                </>
              ) : (
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm text-muted-foreground mb-1">
                      Monto del presupuesto
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={formMonto}
                      onChange={(e) => setFormMonto(e.target.value)}
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-muted-foreground mb-1">
                      Mensaje para el cliente
                    </label>
                    <textarea
                      value={formMensaje}
                      onChange={(e) => setFormMensaje(e.target.value)}
                      rows={3}
                      className={inputClass}
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" onClick={handleGuardarPresupuesto} disabled={guardandoPresupuesto}>
                      {guardandoPresupuesto ? "Guardando..." : "Guardar"}
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setEditandoPresupuesto(false);
                        setFormMonto(detalle.montoPresupuesto ?? "");
                        setFormMensaje(detalle.mensajePresupuesto ?? "");
                        setPresupuestoError(null);
                      }}
                    >
                      Cancelar
                    </Button>
                  </div>
                </div>
              )}

              {presupuestoError && <p className="text-sm text-destructive">{presupuestoError}</p>}

              <div className="pt-1">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleEnviarPresupuesto}
                  disabled={!detalle.montoPresupuesto || enviandoPresupuesto}
                >
                  {enviandoPresupuesto ? "Enviando..." : "Enviar presupuesto al cliente"}
                </Button>
                {detalle.linkToken && (
                  <p className="mt-2 text-xs text-muted-foreground break-all">
                    Link de seguimiento: {window.location.origin}/seguimiento/{detalle.linkToken}
                  </p>
                )}
              </div>
            </div>
          )}

          <div className="rounded-xl border border-border bg-card p-6 space-y-4">
            <h2 className="font-semibold">Checklist de recepción</h2>
            {checklistItems ? (
              <ul className="space-y-3 text-sm">
                {CHECKLIST_ITEMS.map((item) => {
                  const valor = checklistItems[item.key];
                  return (
                    <li key={item.key} className="flex items-center justify-between gap-4">
                      <span className="text-muted-foreground">{item.label}</span>
                      <span
                        className={cn(
                          "rounded-full px-3 py-0.5 text-xs font-medium",
                          checklistPill[valor],
                        )}
                      >
                        {checklistLabel[valor]}
                      </span>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">Sin checklist cargado.</p>
            )}
          </div>

          <div className="rounded-xl border border-border bg-card p-6 space-y-4">
            <h2 className="font-semibold">Fotos</h2>
            <FotoPicker
              fotos={[...detalle.fotos.map((f) => f.url), ...fotosPreview]}
              onAdd={(url) => setFotosPreview((prev) => [...prev, url])}
            />
            <p className="text-xs text-muted-foreground">
              Vista previa local únicamente — todavía no se suben ni se guardan (falta definir el
              almacenamiento, mismo pendiente que en Configuración de empresa).
            </p>
          </div>
        </div>

        {/* Columna lateral */}
        <div className="space-y-6">
          <div className="rounded-xl border border-border bg-card p-6">
            <h2 className="font-semibold mb-4">Historial</h2>
            {detalle.historialEstados.length === 0 ? (
              <p className="text-sm text-muted-foreground">Sin movimientos todavía.</p>
            ) : (
              <ol>
                {detalle.historialEstados.map((h, i) => {
                  const isLast = i === detalle.historialEstados.length - 1;
                  const meta = ESTADO_META[h.estadoNuevo];
                  return (
                    <li key={h.id} className="flex gap-3">
                      <div className="flex flex-col items-center">
                        <span className={cn("mt-1.5 size-2.5 shrink-0 rounded-full bg-current", meta.text)} />
                        {!isLast && <span className="w-px flex-1 bg-border" />}
                      </div>
                      <div className={cn("min-w-0 flex-1", !isLast && "pb-5")}>
                        <p className="text-sm font-semibold">
                          {h.estadoAnterior ? ESTADO_META[h.estadoAnterior].label : "Alta"} →{" "}
                          {meta.label}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {h.usuario?.nombre ?? "Cliente"} · {fechaHoraFmt.format(new Date(h.fecha))}
                        </p>
                        {h.comentario && <p className="text-sm mt-1">{h.comentario}</p>}
                      </div>
                    </li>
                  );
                })}
              </ol>
            )}
          </div>

          <div className="rounded-xl border border-border bg-card p-6 space-y-4">
            <div className="flex items-center justify-between gap-3">
              <h2 className="font-semibold">Documentos</h2>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  nativeButton={false}
                  render={<a href={`/api/reparaciones/${id}/pdf`} target="_blank" rel="noopener noreferrer" />}
                >
                  Descargar PDF
                </Button>
                <Button size="sm" onClick={handleGenerarOrden} disabled={generando}>
                  {generando ? "Generando..." : "Registrar envío"}
                </Button>
              </div>
            </div>
            {detalle.documentosGenerados.length === 0 ? (
              <p className="text-sm text-muted-foreground">Todavía no se generó ninguna orden.</p>
            ) : (
              <ul className="space-y-3 text-sm">
                {detalle.documentosGenerados.map((doc) => (
                  <li key={doc.id} className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-medium">
                        {documentoTipoLabel[doc.tipoDocumento] ?? doc.tipoDocumento}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {doc.canalEnvio === "WHATSAPP_MOCK" ? "WhatsApp" : "Email"} ·{" "}
                        {fechaHoraFmt.format(new Date(doc.fechaEnvio))}
                      </p>
                    </div>
                    <span
                      className={cn(
                        "shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium",
                        documentoEnvioPill[doc.estadoEnvio],
                      )}
                    >
                      {documentoEnvioLabel[doc.estadoEnvio]}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
