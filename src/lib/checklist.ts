import { z } from "zod";

export type ChecklistValor = "SI" | "NO" | "NA";

export type ChecklistRecepcion = {
  enciende: ChecklistValor;
  cargador: ChecklistValor;
  golpes: ChecklistValor;
  clave: ChecklistValor;
  datosRespaldados: ChecklistValor;
  accesorios: ChecklistValor;
};

export const CHECKLIST_ITEMS: { key: keyof ChecklistRecepcion; label: string }[] = [
  { key: "enciende", label: "Equipo enciende" },
  { key: "cargador", label: "Cargador / fuente incluida" },
  { key: "golpes", label: "Golpes o roturas visibles" },
  { key: "clave", label: "Clave o patrón de desbloqueo provisto" },
  { key: "datosRespaldados", label: "Datos respaldados por el cliente" },
  { key: "accesorios", label: "Accesorios adicionales (mouse, funda, etc.)" },
];

// Arranca en "N/A" a propósito: si defaulteara en "Sí" un técnico podría
// registrar la recepción sin haber revisado de verdad cada ítem.
export const DEFAULT_CHECKLIST: ChecklistRecepcion = {
  enciende: "NA",
  cargador: "NA",
  golpes: "NA",
  clave: "NA",
  datosRespaldados: "NA",
  accesorios: "NA",
};

const checklistValorSchema = z.enum(["SI", "NO", "NA"]);

export const checklistSchema = z.object({
  enciende: checklistValorSchema,
  cargador: checklistValorSchema,
  golpes: checklistValorSchema,
  clave: checklistValorSchema,
  datosRespaldados: checklistValorSchema,
  accesorios: checklistValorSchema,
});
