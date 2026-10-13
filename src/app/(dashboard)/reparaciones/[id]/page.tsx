import { requireSession } from "@/lib/session";
import DetalleClient from "./detalle-client";

export default async function ReparacionDetallePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await requireSession();
  const { id } = await params;
  return <DetalleClient id={id} rol={session.user.rol} />;
}
