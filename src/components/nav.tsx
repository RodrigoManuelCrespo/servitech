"use client";

import {
  CirclePlus,
  LayoutDashboard,
  Settings,
  UserCog,
  Users,
  Wrench,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { Rol } from "@prisma/client";
import { cn } from "@/lib/utils";
import { logout } from "@/lib/actions";

const navItems = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard, adminOnly: false },
  { href: "/reparaciones", label: "Reparaciones", icon: Wrench, adminOnly: false },
  { href: "/reparaciones/nueva", label: "Nueva recepción", icon: CirclePlus, adminOnly: false },
  { href: "/clientes", label: "Clientes", icon: Users, adminOnly: false },
  { href: "/usuarios", label: "Usuarios", icon: UserCog, adminOnly: true },
  { href: "/configuracion", label: "Configuración", icon: Settings, adminOnly: true },
] as const;

const ROL_LABEL: Record<Rol, string> = {
  ADMIN: "Administrador",
  TECNICO: "Técnico",
};

function initials(nombre: string) {
  const parts = nombre.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase();
}

export function Nav({ nombre, rol }: { nombre: string; rol: Rol }) {
  const pathname = usePathname();

  return (
    <aside className="flex h-full w-64 shrink-0 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground">
      <div className="flex items-center gap-2 px-5 py-5">
        <div className="flex size-8 items-center justify-center rounded-lg bg-primary text-sm font-bold text-primary-foreground">
          S
        </div>
        <span className="text-lg font-semibold">ServiTech</span>
      </div>

      <nav className="flex flex-1 flex-col gap-1 px-3">
        {navItems
          .filter((item) => !item.adminOnly || rol === "ADMIN")
          .map((item) => {
            const active = pathname === item.href;
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                  active
                    ? "bg-sidebar-accent text-sidebar-accent-foreground"
                    : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground",
                )}
              >
                <Icon className="size-4" />
                {item.label}
              </Link>
            );
          })}
      </nav>

      <div className="border-t border-sidebar-border p-4">
        <div className="mb-3 flex items-center gap-3">
          <div className="flex size-9 items-center justify-center rounded-full bg-secondary text-xs font-semibold text-secondary-foreground">
            {initials(nombre)}
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">{nombre}</p>
            <p className="text-xs text-muted-foreground">{ROL_LABEL[rol]}</p>
          </div>
        </div>
        <form action={logout}>
          <button
            type="submit"
            className="w-full rounded-md bg-secondary px-3 py-2 text-sm font-medium text-secondary-foreground transition-colors hover:bg-secondary/80"
          >
            Cerrar sesión
          </button>
        </form>
      </div>
    </aside>
  );
}
