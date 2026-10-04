"use client";

import { useState } from "react";
import { ClienteStep, type ClienteResumen } from "./cliente-step";
import { EquipoStep, type EquipoResumen } from "./equipo-step";
import { RecepcionStep } from "./recepcion-step";

export function Wizard() {
  const [cliente, setCliente] = useState<ClienteResumen | null>(null);
  const [equipo, setEquipo] = useState<EquipoResumen | null>(null);

  return (
    <div className="space-y-6">
      <ClienteStep
        selected={cliente}
        onSelect={setCliente}
        onChange={() => {
          setCliente(null);
          setEquipo(null);
        }}
      />

      {cliente && (
        <EquipoStep
          clienteId={cliente.id}
          selected={equipo}
          onSelect={setEquipo}
          onChange={() => setEquipo(null)}
        />
      )}

      {cliente && equipo && <RecepcionStep equipoId={equipo.id} />}
    </div>
  );
}
