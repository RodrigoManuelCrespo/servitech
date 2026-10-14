import { redirect } from "next/navigation";
import { requireSession } from "@/lib/session";
import DashboardClient from "./dashboard-client";

export default async function DashboardPage() {
  // requireSession valida la autenticación y devuelve la sesión actual
  const session = await requireSession();

  // Redirigir si el rol del usuario es Técnico
  if (session.user.rol === "TECNICO") {
    redirect("/reparaciones");
  }

  return <DashboardClient />;
}