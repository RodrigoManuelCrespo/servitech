import { Document, Page, Text, View, Image, StyleSheet } from "@react-pdf/renderer";
import { CHECKLIST_ITEMS, type ChecklistRecepcion } from "@/lib/checklist";

const checklistLabel: Record<"SI" | "NO" | "NA", string> = { SI: "Sí", NO: "No", NA: "N/A" };

const styles = StyleSheet.create({
  page: { padding: 32, fontSize: 11, fontFamily: "Helvetica", color: "#111827" },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
    borderBottom: "1pt solid #e5e7eb",
    paddingBottom: 12,
  },
  logo: { width: 48, height: 48, objectFit: "contain" },
  empresaNombre: { fontSize: 16, fontWeight: 700 },
  empresaDato: { fontSize: 9, color: "#6b7280" },
  titulo: { fontSize: 18, fontWeight: 700, marginBottom: 4 },
  subtitulo: { fontSize: 10, color: "#374151", marginBottom: 16 },
  section: { marginBottom: 16 },
  sectionTitle: { fontSize: 12, fontWeight: 700, marginBottom: 6, color: "#111827" },
  row: { flexDirection: "row", marginBottom: 3 },
  label: { width: 110, color: "#6b7280" },
  value: { flex: 1 },
  checklistRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 2,
    borderBottom: "0.5pt solid #f3f4f6",
  },
  aviso: {
    marginTop: 8,
    padding: 8,
    fontSize: 9,
    color: "#374151",
    border: "0.5pt solid #e5e7eb",
  },
  footer: {
    position: "absolute",
    bottom: 24,
    left: 32,
    right: 32,
    fontSize: 8,
    color: "#9ca3af",
    textAlign: "center",
  },
});

const fechaFmt = (d: Date) => new Intl.DateTimeFormat("es-AR", { dateStyle: "short" }).format(d);
const fechaHoraFmt = (d: Date) =>
  new Intl.DateTimeFormat("es-AR", { dateStyle: "short", timeStyle: "short" }).format(d);

// Comprobante que se le da al cliente al dejar el equipo. Solo datos de la
// recepción: nada interno del taller (diagnóstico, técnico, estado).
export type OrdenRecepcionData = {
  id: string;
  checklist: ChecklistRecepcion | null;
  fechaIngreso: Date;
  equipo: {
    tipo: string;
    marca: string;
    modelo: string;
    numeroSerie: string | null;
    observaciones: string | null;
    cliente: { nombre: string; telefono: string; email: string | null };
  };
};

export type OrdenRecepcionEmpresa = {
  nombre: string;
  telefono: string | null;
  email: string | null;
  logoUrl: string | null;
};

export function OrdenRecepcionPdf({
  reparacion,
  empresa,
}: {
  reparacion: OrdenRecepcionData;
  empresa: OrdenRecepcionEmpresa;
}) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <View>
            <Text style={styles.empresaNombre}>{empresa.nombre}</Text>
            {empresa.telefono && <Text style={styles.empresaDato}>{empresa.telefono}</Text>}
            {empresa.email && <Text style={styles.empresaDato}>{empresa.email}</Text>}
          </View>
          {empresa.logoUrl && <Image src={empresa.logoUrl} style={styles.logo} />}
        </View>

        <Text style={styles.titulo}>Orden de recepción r{reparacion.id.slice(-4)}</Text>
        <Text style={styles.subtitulo}>Fecha de ingreso: {fechaFmt(reparacion.fechaIngreso)}</Text>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Cliente</Text>
          <View style={styles.row}>
            <Text style={styles.label}>Nombre</Text>
            <Text style={styles.value}>{reparacion.equipo.cliente.nombre}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Teléfono</Text>
            <Text style={styles.value}>{reparacion.equipo.cliente.telefono}</Text>
          </View>
          {reparacion.equipo.cliente.email && (
            <View style={styles.row}>
              <Text style={styles.label}>Email</Text>
              <Text style={styles.value}>{reparacion.equipo.cliente.email}</Text>
            </View>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Equipo</Text>
          <View style={styles.row}>
            <Text style={styles.label}>Tipo</Text>
            <Text style={styles.value}>{reparacion.equipo.tipo}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Marca / Modelo</Text>
            <Text style={styles.value}>
              {reparacion.equipo.marca} {reparacion.equipo.modelo}
            </Text>
          </View>
          {reparacion.equipo.numeroSerie && (
            <View style={styles.row}>
              <Text style={styles.label}>N° de serie</Text>
              <Text style={styles.value}>{reparacion.equipo.numeroSerie}</Text>
            </View>
          )}
          {reparacion.equipo.observaciones && (
            <View style={styles.row}>
              <Text style={styles.label}>Observaciones</Text>
              <Text style={styles.value}>{reparacion.equipo.observaciones}</Text>
            </View>
          )}
        </View>

        {reparacion.checklist && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Estado del equipo al recibirlo</Text>
            {CHECKLIST_ITEMS.map((item) => (
              <View key={item.key} style={styles.checklistRow}>
                <Text>{item.label}</Text>
                <Text>{checklistLabel[reparacion.checklist![item.key]]}</Text>
              </View>
            ))}
          </View>
        )}

        <Text style={styles.aviso}>
          Conservá esta orden: identifica a tu equipo y la vas a necesitar para retirarlo.
        </Text>

        <Text style={styles.footer}>
          Documento generado por {empresa.nombre} · {fechaHoraFmt(new Date())}
        </Text>
      </Page>
    </Document>
  );
}
