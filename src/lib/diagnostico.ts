// Plantilla del diagnóstico que carga el técnico. La estimación de costos
// es interna: el precio al cliente lo arma el admin en el presupuesto.
export const PLANTILLA_DIAGNOSTICO = [
  "Problema encontrado: ",
  "Solución propuesta: ",
  "Repuestos necesarios: ",
  "Costo estimado de repuestos y mano de obra: ",
  "Tiempo estimado de reparación: ",
].join("\n");

// Vacío o la plantilla sin completar.
export function diagnosticoVacio(texto: string | null | undefined) {
  const t = (texto ?? "").trim();
  return !t || t === PLANTILLA_DIAGNOSTICO.trim();
}
