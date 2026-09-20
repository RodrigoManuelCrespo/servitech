"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { EstadoReparacion, Rol } from "@prisma/client";
import { Button, buttonVariants } from "@/components/ui/button";
import { StatusBadge } from "@/components/status-badge";
import { ESTADOS, ESTADO_META } from "@/lib/estado";
import { TECNICOS_MOCK } from "@/lib/tecnicos-mock";

type ReparacionRow = {
  id: string;
  estado: EstadoReparacion;
  fechaIngreso: string;
  fechaEntrega: string | null;
  equipo: { marca: string; modelo: string; cliente: { nombre: string } };
  tecnicoAsignado: { nombre: string } | null;
};

const fechaFmt = new Intl.DateTimeFormat("es-AR", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

const selectClass =
  "rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

export function ReparacionesList({ rol }: { rol: Rol }) {
  const [estado, setEstado] = useState("");
  const [tecnicoId, setTecnicoId] = useState("");
  const [cliente, setCliente] = useState("");
  const [reparaciones, setReparaciones] = useState<ReparacionRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const timeout = setTimeout(() => {
      const params = new URLSearchParams();
      if (estado) params.set("estado", estado);
      if (tecnicoId) params.set("tecnicoId", tecnicoId);
      if (cliente.trim()) params.set("cliente", cliente.trim());

      setLoading(true);
      fetch(`/api/reparaciones?${params.toString()}`)
        .then((res) => res.json())
        .then(setReparaciones)
        .finally(() => setLoading(false));
    }, 300);

    return () => clearTimeout(timeout);
  }, [estado, tecnicoId, cliente]);

  function limpiarFiltros() {
    setEstado("");
    setTecnicoId("");
    setCliente("");
  }

  const hayFiltros = Boolean(estado || tecnicoId || cliente.trim());

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-wrap items-end gap-3">
          <div className="space-y-1">
            <label className="text-sm font-medium">Estado</label>
            <select
              value={estado}
              onChange={(e) => setEstado(e.target.value)}
              className={selectClass}
            >
              <option value="">Todos</option>
              {ESTADOS.map((e) => (
                <option key={e} value={e}>
                  {ESTADO_META[e].label}
                </option>
              ))}
            </select>
          </div>

          {rol === "ADMIN" && (
            <div className="space-y-1">
              <label className="text-sm font-medium">Técnico asignado</label>
              <select
                value={tecnicoId}
                onChange={(e) => setTecnicoId(e.target.value)}
                className={selectClass}
              >
                <option value="">Todos</option>
                {TECNICOS_MOCK.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.nombre}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="space-y-1">
            <label className="text-sm font-medium">Cliente</label>
            <input
              value={cliente}
              onChange={(e) => setCliente(e.target.value)}
              placeholder="Buscar cliente..."
              className={selectClass}
            />
          </div>

          {hayFiltros && (
            <Button type="button" variant="outline" onClick={limpiarFiltros}>
              Limpiar filtros
            </Button>
          )}
        </div>

        <div className="flex items-center gap-4">
          <span className="text-sm text-muted-foreground">
            {loading ? "Cargando..." : `${reparaciones.length} reparaciones`}
          </span>
          <Link href="/reparaciones/nueva" className={buttonVariants({ variant: "default" })}>
            + Nueva recepción
          </Link>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs tracking-wide text-muted-foreground uppercase">
                <th className="px-5 py-3 font-medium">N°</th>
                <th className="px-5 py-3 font-medium">Cliente</th>
                <th className="px-5 py-3 font-medium">Equipo</th>
                <th className="px-5 py-3 font-medium">Estado</th>
                <th className="px-5 py-3 font-medium">Técnico</th>
                <th className="px-5 py-3 font-medium">Ingreso</th>
                <th className="px-5 py-3 font-medium">Entrega</th>
                <th className="px-5 py-3 font-medium" />
              </tr>
            </thead>
            <tbody>
              {reparaciones.map((r) => (
                <tr key={r.id} className="border-b border-border last:border-0">
                  <td className="px-5 py-3 font-medium">#{r.id.slice(-4)}</td>
                  <td className="px-5 py-3">{r.equipo.cliente.nombre}</td>
                  <td className="px-5 py-3 text-muted-foreground">
                    {r.equipo.marca} {r.equipo.modelo}
                  </td>
                  <td className="px-5 py-3">
                    <StatusBadge estado={r.estado} />
                  </td>
                  <td className="px-5 py-3 text-muted-foreground">
                    {r.tecnicoAsignado?.nombre ?? "—"}
                  </td>
                  <td className="px-5 py-3 text-muted-foreground">
                    {fechaFmt.format(new Date(r.fechaIngreso))}
                  </td>
                  <td className="px-5 py-3 text-muted-foreground">
                    {r.fechaEntrega ? fechaFmt.format(new Date(r.fechaEntrega)) : "—"}
                  </td>
                  <td className="px-5 py-3 text-right">
                    <Link
                      href={`/reparaciones/${r.id}`}
                      className="text-primary hover:underline"
                    >
                      Ver detalle →
                    </Link>
                  </td>
                </tr>
              ))}
              {!loading && reparaciones.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-5 py-10 text-center text-muted-foreground">
                    No hay reparaciones que coincidan con los filtros.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
