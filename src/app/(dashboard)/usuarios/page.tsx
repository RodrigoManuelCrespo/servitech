import { requireAdmin } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { FormUsuario } from "./form-usuario";
import { cn } from "@/lib/utils";

export default async function UsuariosPage() {
  // Garantiza bloqueo real a nivel Servidor/Router
  const session = await requireAdmin();

  const usuarios = await prisma.usuario.findMany({
    where: { empresaId: session.user.empresaId },
    select: {
      id: true,
      nombre: true,
      email: true,
      rol: true,
      activo: true,
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold">Gestión de Usuarios</h1>
            <span className="rounded-full bg-amber-500/10 px-2.5 py-0.5 text-xs font-semibold text-amber-600 dark:text-amber-400 border border-amber-500/20">
              Solo ADMIN
            </span>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Administra el personal del taller y sus niveles de acceso.
          </p>
        </div>
      </div>

      {/* Grid: Formulario a la derecha / Tabla a la izquierda */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Tabla de Usuarios (2 cols) */}
        <div className="lg:col-span-2 rounded-xl border border-border bg-card overflow-hidden">
          <div className="p-4 border-b border-border">
            <h2 className="font-semibold text-sm">
              Usuarios registrados ({usuarios.length})
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/50 text-left text-xs tracking-wide text-muted-foreground uppercase">
                  <th className="px-5 py-3 font-medium">Nombre</th>
                  <th className="px-5 py-3 font-medium">Email</th>
                  <th className="px-5 py-3 font-medium">Rol</th>
                  <th className="px-5 py-3 font-medium">Estado</th>
                </tr>
              </thead>
              <tbody>
                {usuarios.map((u) => (
                  <tr
                    key={u.id}
                    className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors"
                  >
                    <td className="px-5 py-3 font-medium">{u.nombre}</td>
                    <td className="px-5 py-3 text-muted-foreground">{u.email}</td>
                    <td className="px-5 py-3">
                      <span
                        className={cn(
                          "inline-flex items-center rounded-md px-2 py-1 text-xs font-medium border",
                          u.rol === "ADMIN"
                            ? "bg-purple-500/10 text-purple-700 border-purple-500/20 dark:text-purple-300"
                            : "bg-blue-500/10 text-blue-700 border-blue-500/20 dark:text-blue-300"
                        )}
                      >
                        {u.rol === "ADMIN" ? "Administrador" : "Técnico"}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      <span
                        className={cn(
                          "inline-flex items-center gap-1.5 text-xs font-medium",
                          u.activo ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground"
                        )}
                      >
                        <span
                          className={cn(
                            "h-1.5 w-1.5 rounded-full",
                            u.activo ? "bg-emerald-500" : "bg-muted-foreground"
                          )}
                        />
                        {u.activo ? "Activo" : "Inactivo"}
                      </span>
                    </td>
                  </tr>
                ))}

                {usuarios.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-5 py-8 text-center text-muted-foreground">
                      No hay usuarios cargados en la empresa.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Formulario de Alta (1 col) */}
        <div>
          <FormUsuario />
        </div>
      </div>
    </div>
  );
}