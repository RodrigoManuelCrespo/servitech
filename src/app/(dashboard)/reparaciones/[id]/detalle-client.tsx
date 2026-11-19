"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import type { EstadoReparacion, Rol } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { FotoPicker } from "@/components/foto-picker";
import { StatusBadge } from "@/components/status-badge";
import {
  ESTADOS_PARA_RETIRAR,
  ESTADOS_REASIGNABLES,
  ESTADO_META,
  diagnosticoEditable as esDiagnosticoEditable,
  presupuestoEditable as esPresupuestoEditable,
  transicionesPara,
} from "@/lib/estado";
import { PLANTILLA_DIAGNOSTICO, diagnosticoVacio } from "@/lib/diagnostico";
import { textoWhatsAppRetiro } from "@/lib/aviso-retiro";
import { CHECKLIST_ITEMS, type ChecklistRecepcion } from "@/lib/checklist";
import {
  CANALES_RESPUESTA,
  CANALES_RESPUESTA_VALORES,
  PLANTILLA_MENSAJE_PRESUPUESTO,
  formatearMonto,
  linkSeguimiento,
  linkWhatsApp,
  textoWhatsAppPresupuesto,
} from "@/lib/presupuesto";
import { cn } from "@/lib/utils";

type Detalle = {
  id: string;
  estado: EstadoReparacion;
  fallaReportada: string | null;
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
  empresa: { nombre: string };
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
  fotos: { id: string }[];
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
  ORDEN_PDF: "Orden de recepción",
  PRESUPUESTO: "Presupuesto",
  AVISO_RETIRO: "Aviso de retiro",
};

// Qué explicarle al usuario cuando, con su rol, no tiene cambios de estado
// disponibles (le toca a otra persona).
function mensajeSinCambios(estado: EstadoReparacion): string {
  if (estado === "ENTREGADO") return "Estado final: el equipo ya fue entregado al cliente.";
  if (estado === "AUTORIZAR") return "Esperando la respuesta del cliente al presupuesto.";
  if (estado === "REPARADO" || estado === "NO_REPARABLE" || estado === "RECHAZADO") {
    return "Listo para devolver al cliente. La entrega la registra el administrador.";
  }
  return "No hay cambios de estado disponibles.";
}

const inputClass =
  "w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary";

export default function DetalleClient({
  id,
  rol,
  avisoOrden,
}: {
  id: string;
  rol: Rol;
  // Viene del wizard cuando la orden de recepción no salió por email.
  avisoOrden?: "sin-email" | "error";
}) {
  const [detalle, setDetalle] = useState<Detalle | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [tecnicos, setTecnicos] = useState<Tecnico[]>([]);

  // Cambiar estado
  const [formEstado, setFormEstado] = useState("");
  const [formComentario, setFormComentario] = useState("");
  const [formCanal, setFormCanal] = useState("");
  // Al pasar a Diagnosticado el diagnóstico se carga en la misma tarjeta.
  const [formDiagnosticoEstado, setFormDiagnosticoEstado] = useState("");
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
  const [diagnosticoError, setDiagnosticoError] = useState<string | null>(null);

  // Aviso de retiro (admin-only)
  const [enviandoAviso, setEnviandoAviso] = useState(false);
  const [avisoRetiro, setAvisoRetiro] = useState<"ENVIADO" | "ERROR" | "SIN_EMAIL" | null>(null);


  // Presupuesto (admin-only)
  const [editandoPresupuesto, setEditandoPresupuesto] = useState(false);
  const [formMonto, setFormMonto] = useState("");
  const [formMensaje, setFormMensaje] = useState("");
  const [guardandoPresupuesto, setGuardandoPresupuesto] = useState(false);
  const [presupuestoError, setPresupuestoError] = useState<string | null>(null);
  const [enviandoPresupuesto, setEnviandoPresupuesto] = useState(false);
  // Resultado del último envío por email (para avisar si no salió).
  const [avisoPresupuesto, setAvisoPresupuesto] = useState<"ENVIADO" | "ERROR" | "SIN_EMAIL" | null>(
    null,
  );
  const [linkCopiado, setLinkCopiado] = useState(false);


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
        setFormCanal("");
        setFormDiagnosticoEstado("");
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
      body: JSON.stringify({
        estado: formEstado,
        comentario: formComentario || undefined,
        canalRespuesta: formCanal || undefined,
        diagnostico: formEstado === "DIAGNOSTICADO" ? formDiagnosticoEstado : undefined,
      }),
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
    setDiagnosticoError(null);
    const res = await fetch(`/api/reparaciones/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ diagnostico: formDiagnostico }),
    });
    if (res.ok) {
      cargar();
    } else {
      const data: { error?: string } = await res.json().catch(() => ({}));
      setDiagnosticoError(data.error ?? "No se pudo guardar el diagnóstico.");
    }
    setGuardandoDiagnostico(false);
  }

  function abrirEditorDiagnostico() {
    if (!formDiagnostico.trim()) setFormDiagnostico(PLANTILLA_DIAGNOSTICO);
    setEditandoDiagnostico(true);
  }

  async function handleAvisoRetiroEmail() {
    setEnviandoAviso(true);
    setAvisoRetiro(null);
    const res = await fetch(`/api/reparaciones/${id}/aviso-retiro`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ canal: "EMAIL" }),
    });
    const data: { email?: "ENVIADO" | "ERROR" | "SIN_EMAIL" } = await res.json().catch(() => ({}));
    setAvisoRetiro(res.ok ? (data.email ?? null) : "ERROR");
    if (res.ok) cargar();
    setEnviandoAviso(false);
  }

  // El link abre WhatsApp en otra pestaña; acá solo queda registrado.
  function handleAvisoRetiroWhatsApp() {
    fetch(`/api/reparaciones/${id}/aviso-retiro`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ canal: "WHATSAPP" }),
    }).then((res) => {
      if (res.ok) cargar();
    });
  }

  // Las fotos se actualizan en la lista local (sin recargar todo) para no
  // perder lo que el usuario esté editando en otra tarjeta.
  async function handleSubirFoto(dataUri: string) {
    const res = await fetch(`/api/reparaciones/${id}/fotos`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: dataUri }),
    });
    const data: { id?: string; error?: string } = await res.json().catch(() => ({}));
    if (!res.ok || !data.id) throw new Error(data.error ?? "No se pudo subir la foto.");
    const fotoId = data.id;
    setDetalle((prev) => (prev ? { ...prev, fotos: [...prev.fotos, { id: fotoId }] } : prev));
  }

  async function handleQuitarFoto(fotoId: string) {
    if (!window.confirm("¿Borrar esta foto?")) return;
    const res = await fetch(`/api/reparaciones/${id}/fotos/${fotoId}`, { method: "DELETE" });
    if (!res.ok) {
      const data: { error?: string } = await res.json().catch(() => ({}));
      throw new Error(data.error ?? "No se pudo borrar la foto.");
    }
    setDetalle((prev) =>
      prev ? { ...prev, fotos: prev.fotos.filter((f) => f.id !== fotoId) } : prev,
    );
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
    setAvisoPresupuesto(null);
    const res = await fetch(`/api/reparaciones/${id}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tipoDocumento: "PRESUPUESTO" }),
    });
    const data: { email?: "ENVIADO" | "ERROR" | "SIN_EMAIL"; error?: string } = await res
      .json()
      .catch(() => ({}));
    if (res.ok) {
      setAvisoPresupuesto(data.email ?? null);
      cargar();
    } else {
      setPresupuestoError(data.error ?? "No se pudo enviar el presupuesto.");
    }
    setEnviandoPresupuesto(false);
  }

  // El link abre WhatsApp en otra pestaña; acá solo queda registrado.
  function handleRegistrarWhatsApp() {
    fetch(`/api/reparaciones/${id}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tipoDocumento: "PRESUPUESTO", canalEnvio: "WHATSAPP_MOCK" }),
    }).then((res) => {
      if (res.ok) cargar();
    });
  }

  async function handleCopiarLink(link: string) {
    try {
      await navigator.clipboard.writeText(link);
      setLinkCopiado(true);
      setTimeout(() => setLinkCopiado(false), 2000);
    } catch {
      window.prompt("Copiá el link:", link);
    }
  }

  function abrirEditorPresupuesto() {
    // El primer presupuesto arranca con los datos que pide la ley.
    if (!detalle?.mensajePresupuesto && !formMensaje.trim()) {
      setFormMensaje(PLANTILLA_MENSAJE_PRESUPUESTO);
    }
    setEditandoPresupuesto(true);
  }

  if (notFound) {
    return <p className="text-sm text-destructive">No se encontró la reparación.</p>;
  }
  if (!detalle) {
    return <p className="text-muted-foreground">Cargando...</p>;
  }

  const transiciones = transicionesPara(detalle.estado, rol);
  const seleccionada = transiciones.find((t) => t.estado === formEstado);
  const faltaDiagnostico = formEstado === "DIAGNOSTICADO" && diagnosticoVacio(formDiagnosticoEstado);
  const diagnosticoEditable = esDiagnosticoEditable(detalle.estado, rol, !!detalle.linkToken);
  const equipoTexto = `${detalle.equipo.tipo} ${detalle.equipo.marca} ${detalle.equipo.modelo}`;
  const paraRetirar = ESTADOS_PARA_RETIRAR.includes(detalle.estado);
  const ultimoAviso = detalle.documentosGenerados.find((d) => d.tipoDocumento === "AVISO_RETIRO");
  const whatsappRetiro = paraRetirar
    ? linkWhatsApp(
        detalle.equipo.cliente.telefono,
        textoWhatsAppRetiro({
          estado: detalle.estado,
          equipo: equipoTexto,
          numero: `r${detalle.id.slice(-4)}`,
          monto: detalle.montoPresupuesto,
          cliente: detalle.equipo.cliente.nombre,
          empresa: detalle.empresa.nombre,
        }),
      )
    : null;
  const faltaMotivo = !!seleccionada?.requiereMotivo && !formComentario.trim();
  // El admin registra una respuesta que el cliente dio por teléfono, etc.
  const registraRespuesta =
    detalle.estado === "AUTORIZAR" && (formEstado === "APROBADO" || formEstado === "RECHAZADO");
  const faltaCanal = registraRespuesta && !formCanal;
  const presupuestoEditable = esPresupuestoEditable(detalle.estado, !!detalle.linkToken);
  const emailCliente = detalle.equipo.cliente.email;
  const linkCliente =
    detalle.linkToken && typeof window !== "undefined"
      ? linkSeguimiento(window.location.origin, detalle.linkToken)
      : null;
  const whatsapp =
    linkCliente && detalle.montoPresupuesto
      ? linkWhatsApp(
          detalle.equipo.cliente.telefono,
          textoWhatsAppPresupuesto({
            cliente: detalle.equipo.cliente.nombre,
            equipo: equipoTexto,
            monto: detalle.montoPresupuesto,
            link: linkCliente,
            empresa: detalle.empresa.nombre,
          }),
        )
      : null;
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

      {avisoOrden && rol === "ADMIN" && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-estado-autorizar/40 bg-estado-autorizar/10 p-4 text-sm">
          <p>
            {avisoOrden === "sin-email"
              ? "Recepción registrada. El cliente no tiene email: descargá la orden de recepción e imprimila para entregársela."
              : "Recepción registrada, pero no se pudo enviar la orden por email. Descargala e imprimila para entregársela."}
          </p>
          <Button
            size="sm"
            nativeButton={false}
            render={<a href={`/api/reparaciones/${id}/pdf`} target="_blank" rel="noopener noreferrer" />}
          >
            Descargar orden de recepción
          </Button>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Columna principal */}
        <div className="lg:col-span-2 space-y-6">
          <div className="rounded-xl border border-border bg-card p-6 space-y-3">
            <h2 className="font-semibold">Cambiar estado</h2>
            {detalle.estado === "DIAGNOSTICADO" && (
              <p className="text-sm text-muted-foreground">
                {rol === "ADMIN"
                  ? "Para avanzar, cargá y enviá el presupuesto al cliente (más abajo)."
                  : "Esperando que el administrador envíe el presupuesto al cliente."}
              </p>
            )}
            {detalle.estado === "AUTORIZAR" && rol === "ADMIN" && (
              <p className="text-sm text-muted-foreground">
                Esperando la respuesta del cliente. Si te respondió por teléfono, WhatsApp o en el
                local, registrala acá.
              </p>
            )}
            {transiciones.length > 0 ? (
              <>
                <select
                  value={formEstado}
                  onChange={(e) => {
                    setFormEstado(e.target.value);
                    if (e.target.value === "DIAGNOSTICADO" && !formDiagnosticoEstado) {
                      setFormDiagnosticoEstado(detalle.diagnostico || PLANTILLA_DIAGNOSTICO);
                    }
                  }}
                  className={inputClass}
                >
                  <option value="">Seleccionar nuevo estado</option>
                  {transiciones.map((t) => (
                    <option key={t.estado} value={t.estado}>
                      {t.estado === "RECIBIDO" ? "Recibido (volver a revisar)" : ESTADO_META[t.estado].label}
                    </option>
                  ))}
                </select>
                {registraRespuesta && (
                  <select
                    value={formCanal}
                    onChange={(e) => setFormCanal(e.target.value)}
                    className={inputClass}
                    aria-label="Cómo respondió el cliente"
                  >
                    <option value="">¿Cómo respondió el cliente?</option>
                    {CANALES_RESPUESTA_VALORES.map((c) => (
                      <option key={c} value={c}>
                        {CANALES_RESPUESTA[c].label}
                      </option>
                    ))}
                  </select>
                )}
                {formEstado === "DIAGNOSTICADO" && (
                  <div>
                    <label className="block text-sm text-muted-foreground mb-1" htmlFor="diagnostico-estado">
                      Diagnóstico (obligatorio)
                    </label>
                    <textarea
                      id="diagnostico-estado"
                      value={formDiagnosticoEstado}
                      onChange={(ev) => setFormDiagnosticoEstado(ev.target.value)}
                      rows={6}
                      className={inputClass}
                    />
                  </div>
                )}
                {formEstado === "RECIBIDO" && (
                  <p className="text-sm text-muted-foreground">
                    Vuelve a revisión para una segunda opinión: después podés reasignarla a otro
                    técnico, que carga un nuevo diagnóstico.
                    {ultimoAviso && (
                      <span className="mt-1 block text-estado-autorizar">
                        Ya se le avisó al cliente que retire el equipo: comunicate con él.
                      </span>
                    )}
                  </p>
                )}
                {formEstado && formEstado !== "DIAGNOSTICADO" && (
                  <textarea
                    value={formComentario}
                    onChange={(ev) => setFormComentario(ev.target.value)}
                    placeholder={
                      formEstado === "RECIBIDO"
                        ? "Motivo (obligatorio). Ej: segunda opinión con otro técnico"
                        : seleccionada?.requiereMotivo
                          ? "Motivo (obligatorio)"
                          : "Comentario (opcional)"
                    }
                    rows={2}
                    className={inputClass}
                  />
                )}
                {estadoError && <p className="text-sm text-destructive">{estadoError}</p>}
                <Button
                  onClick={handleCambiarEstado}
                  disabled={
                    !formEstado || faltaMotivo || faltaCanal || faltaDiagnostico || cambiandoEstado
                  }
                >
                  {cambiandoEstado ? "Guardando..." : "Confirmar cambio"}
                </Button>
              </>
            ) : (
              detalle.estado !== "DIAGNOSTICADO" && (
                <p className="text-sm text-muted-foreground">{mensajeSinCambios(detalle.estado)}</p>
              )
            )}
          </div>

          {rol === "ADMIN" && paraRetirar && (
            <div className="rounded-xl border border-border bg-card p-6 space-y-3">
              <h2 className="font-semibold">Aviso de retiro</h2>
              <p className="text-sm text-muted-foreground">
                {ultimoAviso
                  ? `Último aviso: ${fechaHoraFmt.format(new Date(ultimoAviso.fechaEnvio))} por ${
                      ultimoAviso.canalEnvio === "EMAIL" ? "email" : "WhatsApp"
                    }${ultimoAviso.estadoEnvio === "ERROR" ? " (no se pudo enviar)" : ""}.`
                  : "Todavía no se le avisó al cliente que puede retirar el equipo."}
              </p>
              {avisoRetiro && (
                <p
                  className={cn(
                    "rounded-lg border p-3 text-sm",
                    avisoRetiro === "ENVIADO"
                      ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
                      : "border-estado-autorizar/40 bg-estado-autorizar/10",
                  )}
                >
                  {avisoRetiro === "ENVIADO"
                    ? `Aviso enviado por email a ${emailCliente}.`
                    : avisoRetiro === "SIN_EMAIL"
                      ? "El cliente no tiene email: avisale por WhatsApp."
                      : "No se pudo enviar el email. Reintentá o avisale por WhatsApp."}
                </p>
              )}
              <div className="flex flex-wrap gap-2">
                {emailCliente && (
                  <Button size="sm" variant="outline" onClick={handleAvisoRetiroEmail} disabled={enviandoAviso}>
                    {enviandoAviso ? "Enviando..." : "Avisar por email"}
                  </Button>
                )}
                {whatsappRetiro && (
                  <Button
                    size="sm"
                    nativeButton={false}
                    render={
                      <a
                        href={whatsappRetiro}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={handleAvisoRetiroWhatsApp}
                      />
                    }
                  >
                    Avisar por WhatsApp
                  </Button>
                )}
              </div>
            </div>
          )}

          <div className="rounded-xl border border-border bg-card p-6 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold">Técnico asignado</h2>
              {rol === "ADMIN" && ESTADOS_REASIGNABLES.includes(detalle.estado) && !editandoTecnico && (
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
            <h2 className="font-semibold">Falla reportada por el cliente</h2>
            <p className="text-sm whitespace-pre-wrap">
              {detalle.fallaReportada || (
                <span className="text-muted-foreground">No se registró al recibir el equipo.</span>
              )}
            </p>
          </div>

          <div className="rounded-xl border border-border bg-card p-6 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold">Diagnóstico</h2>
              {diagnosticoEditable && !editandoDiagnostico && (
                <button
                  type="button"
                  onClick={abrirEditorDiagnostico}
                  className="text-sm text-primary hover:underline"
                >
                  {detalle.diagnostico ? "Editar" : "Cargar"}
                </button>
              )}
            </div>
            {!editandoDiagnostico ? (
              <>
                <p className="text-sm whitespace-pre-wrap">
                  {detalle.diagnostico || <span className="text-muted-foreground">Sin diagnóstico cargado.</span>}
                </p>
                {!diagnosticoEditable && detalle.diagnostico && detalle.linkToken && (
                  <p className="text-xs text-muted-foreground">
                    No se puede modificar: el presupuesto ya se envió al cliente.
                  </p>
                )}
              </>
            ) : (
              <div className="space-y-3">
                <textarea
                  value={formDiagnostico}
                  onChange={(e) => setFormDiagnostico(e.target.value)}
                  rows={6}
                  className={inputClass}
                />
                {diagnosticoError && <p className="text-sm text-destructive">{diagnosticoError}</p>}
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={handleGuardarDiagnostico}
                    disabled={
                      guardandoDiagnostico ||
                      (detalle.estado !== "RECIBIDO" && diagnosticoVacio(formDiagnostico))
                    }
                  >
                    {guardandoDiagnostico ? "Guardando..." : "Guardar"}
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      setEditandoDiagnostico(false);
                      setFormDiagnostico(detalle.diagnostico ?? "");
                      setDiagnosticoError(null);
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
                {presupuestoEditable && !editandoPresupuesto && (
                  <button
                    type="button"
                    onClick={abrirEditorPresupuesto}
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
                        {formatearMonto(detalle.montoPresupuesto)}
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
                      rows={5}
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

              {presupuestoEditable && detalle.estado === "RECHAZADO" && (
                <p className="text-xs text-muted-foreground">
                  El cliente rechazó el presupuesto. Si quiere otra opción, modificalo y enviale uno
                  nuevo: la reparación vuelve a &quot;A autorizar&quot;.
                </p>
              )}

              {avisoPresupuesto && (
                <p
                  className={cn(
                    "rounded-lg border p-3 text-sm",
                    avisoPresupuesto === "ENVIADO"
                      ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
                      : "border-estado-autorizar/40 bg-estado-autorizar/10",
                  )}
                >
                  {avisoPresupuesto === "ENVIADO"
                    ? `Presupuesto enviado por email a ${emailCliente}.`
                    : avisoPresupuesto === "SIN_EMAIL"
                      ? "El cliente no tiene email: mandale el presupuesto por WhatsApp o copiá el link."
                      : "No se pudo enviar el email. Reenvialo o mandale el presupuesto por WhatsApp."}
                </p>
              )}

              <div className="space-y-2 pt-1">
                {presupuestoEditable ? (
                  detalle.estado === "AUTORIZAR" && !emailCliente ? null : (
                    <>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={handleEnviarPresupuesto}
                        disabled={
                          !detalle.montoPresupuesto ||
                          Number(detalle.montoPresupuesto) <= 0 ||
                          editandoPresupuesto ||
                          enviandoPresupuesto
                        }
                      >
                        {enviandoPresupuesto
                          ? "Enviando..."
                          : detalle.estado === "AUTORIZAR"
                            ? "Reenviar por email"
                            : detalle.estado === "RECHAZADO"
                              ? "Enviar nuevo presupuesto"
                              : "Enviar presupuesto al cliente"}
                      </Button>
                      {detalle.estado !== "AUTORIZAR" && (
                        <p className="text-xs text-muted-foreground">
                          {emailCliente
                            ? `Le llega por email a ${emailCliente} con el link para aprobarlo o rechazarlo.`
                            : "El cliente no tiene email: después de enviarlo, mandale el link por WhatsApp."}
                        </p>
                      )}
                    </>
                  )
                ) : (
                  <p className="text-xs text-muted-foreground">
                    {detalle.estado === "RECIBIDO"
                      ? "El presupuesto se carga una vez que la reparación está diagnosticada."
                      : "El presupuesto ya no se puede modificar."}
                  </p>
                )}

                {detalle.estado === "AUTORIZAR" && linkCliente && (
                  <div className="flex flex-wrap gap-2">
                    {whatsapp && (
                      <Button
                        size="sm"
                        nativeButton={false}
                        render={
                          <a
                            href={whatsapp}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={handleRegistrarWhatsApp}
                          />
                        }
                      >
                        Enviar por WhatsApp
                      </Button>
                    )}
                    <Button size="sm" variant="outline" onClick={() => handleCopiarLink(linkCliente)}>
                      {linkCopiado ? "Link copiado" : "Copiar link"}
                    </Button>
                  </div>
                )}

                {linkCliente && (
                  <p className="text-xs text-muted-foreground break-all">
                    Link de seguimiento: {linkCliente}
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
              fotos={detalle.fotos.map((f) => {
                const url = `/api/reparaciones/${id}/fotos/${f.id}`;
                return { key: f.id, src: url, href: url };
              })}
              onAgregar={handleSubirFoto}
              onQuitar={handleQuitarFoto}
              deshabilitado={detalle.estado === "ENTREGADO"}
            />
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

          {rol === "ADMIN" && (
            <div className="rounded-xl border border-border bg-card p-6 space-y-4">
              <div className="space-y-3">
                <h2 className="font-semibold">Documentos</h2>
                <div className="flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    nativeButton={false}
                    render={<a href={`/api/reparaciones/${id}/pdf`} target="_blank" rel="noopener noreferrer" />}
                  >
                    Descargar orden de recepción
                  </Button>
                </div>
              </div>
              {detalle.documentosGenerados.length === 0 ? (
                <p className="text-sm text-muted-foreground">Todavía no se envió ningún documento.</p>
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
                      {/* Por WhatsApp solo sabemos que se abrió el chat, no si se envió. */}
                      {doc.canalEnvio === "EMAIL" && (
                        <span
                          className={cn(
                            "shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium",
                            documentoEnvioPill[doc.estadoEnvio],
                          )}
                        >
                          {documentoEnvioLabel[doc.estadoEnvio]}
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
