import { requireApiAdmin } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { z } from "zod";

export async function GET() {
  const auth = await requireApiAdmin();
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }
  const session = auth.session;

  const empresa = await prisma.empresa.findUnique({
    where: { id: session.user.empresaId },
    select: { id: true, nombre: true, telefono: true, email: true, logoUrl: true },
  });

  if (!empresa) {
    return NextResponse.json({ error: "Empresa no encontrada" }, { status: 404 });
  }
  return NextResponse.json(empresa);
}

// El formulario manda "" cuando un campo opcional queda vacío: se guarda como null.
const vacioANull = (v: unknown) =>
  typeof v === "string" && v.trim() === "" ? null : v;

// Logo: data URL (PNG/JPG/WebP) de hasta 500 KB. No alcanza con confiar en el
// tipo que declara el cliente: se revisan también los primeros bytes.
const LOGO_RE = /^data:(image\/(?:png|jpeg|webp));base64,([A-Za-z0-9+/]+={0,2})$/;
const MAX_LOGO_CHARS = Math.ceil((500 * 1024) / 3) * 4 + 100;

function logoValido(v: string) {
  if (v.length > MAX_LOGO_CHARS) return false;
  const m = LOGO_RE.exec(v);
  if (!m) return false;
  const buf = Buffer.from(m[2], "base64");
  if (m[1] === "image/png") {
    return buf.length > 4 && buf.subarray(0, 4).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47]));
  }
  if (m[1] === "image/jpeg") {
    return buf.length > 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff;
  }
  return (
    buf.length > 12 &&
    buf.toString("ascii", 0, 4) === "RIFF" &&
    buf.toString("ascii", 8, 12) === "WEBP"
  );
}

const empresaSchema = z.object({
  nombre: z.string().trim().min(1, "El nombre no puede estar vacío").optional(),
  telefono: z.preprocess(vacioANull, z.string().trim().nullable().optional()),
  email: z.preprocess(
    vacioANull,
    z.string().trim().email("Email inválido").nullable().optional(),
  ),
  logoUrl: z
    .string()
    .refine(logoValido, "El logo debe ser PNG, JPG o WebP de hasta 500 KB.")
    .optional(),
});

export async function PATCH(req: Request) {
  const auth = await requireApiAdmin();
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }
  const session = auth.session;

  const body = await req.json().catch(() => null);
  const parsed = empresaSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  // No se devuelve logoUrl: es un base64 pesado y el cliente ya lo tiene.
  const empresa = await prisma.empresa.update({
    where: { id: session.user.empresaId },
    data: parsed.data,
    select: { id: true, nombre: true, telefono: true, email: true },
  });

  return NextResponse.json(empresa);
}