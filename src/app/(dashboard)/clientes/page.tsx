import { requireAdmin } from "@/lib/session";
import ClientesClient from "./clientes-client";

export default async function ClientesPage() {
  await requireAdmin();
  return <ClientesClient />;
}
