import { NextResponse } from "next/server";
import { requireApiAdmin } from "@/lib/session";
import { generarOrdenRecepcion } from "@/lib/orden-recepcion";

export const runtime = "nodejs";

// GET /api/reparaciones/[id]/pdf — orden de recepción en PDF, generada al
// vuelo. Solo ADMIN: la documentación al cliente la maneja el mostrador.
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireApiAdmin();
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { id } = await params;
  const pdf = await generarOrdenRecepcion(id, auth.session.user.empresaId);
  if (!pdf) {
    return NextResponse.json({ error: "Reparación no encontrada." }, { status: 404 });
  }

  return new NextResponse(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="orden-recepcion-r${id.slice(-4)}.pdf"`,
    },
  });
}
