import { requireAdmin } from "@/lib/session";
import ClienteFichaClient from "./ficha-client";

export default async function ClienteFichaPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdmin();
  const { id } = await params;
  return <ClienteFichaClient id={id} />;
}
