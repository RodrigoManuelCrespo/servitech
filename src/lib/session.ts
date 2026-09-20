import "server-only";
import { redirect } from "next/navigation";
import { auth } from "@/auth";

export async function requireSession() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  return session;
}

export async function requireAdmin() {
  const session = await requireSession();
  if (session.user.rol !== "ADMIN") redirect("/");
  return session;
}

// Para Route Handlers (src/app/api/**): a diferencia de requireSession(),
// acá no tiene sentido redirigir a /login — el que llama es un fetch(), no
// un navegador cargando una página. Devuelve null y el handler responde 401.
export async function requireApiSession() {
  const session = await auth();
  if (!session?.user) return null;
  return session;
}
