import { requireSession } from "@/lib/session";
import DetalleClient from "./detalle-client";

export default async function ReparacionDetallePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ orden?: string }>;
}) {
  const session = await requireSession();
  const { id } = await params;
  // Viene del wizard cuando la orden no salió por email.
  const { orden } = await searchParams;
  const avisoOrden = orden === "sin-email" || orden === "error" ? orden : undefined;
  return <DetalleClient id={id} rol={session.user.rol} avisoOrden={avisoOrden} />;
}
