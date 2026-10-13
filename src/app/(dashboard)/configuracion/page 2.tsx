import { requireAdmin } from "@/lib/session";
import ConfiguracionCliente from "./configuracion-cliente";

export default async function ConfiguracionPage() {
  await requireAdmin();

  return <ConfiguracionCliente />;
}
