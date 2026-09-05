"use client";

import { useEffect, useState } from "react";
import {
  CirclePlus,
  LayoutDashboard,
  Menu,
  Settings,
  UserCog,
  Users,
  Wrench,
  X,
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
  const [open, setOpen] = useState(false);

  // Cerrar el drawer automáticamente al navegar a otra pantalla.
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn(
          "fixed top-4 left-4 z-30 flex size-10 items-center justify-center rounded-md border border-border bg-card text-foreground shadow-sm md:hidden",
          open && "hidden",
        )}
        aria-label="Abrir menú"
      >
        <Menu className="size-5" />
      </button>

      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          onClick={() => setOpen(false)}
          aria-hidden="true"
        />
      )}

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex h-full w-64 shrink-0 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground transition-transform duration-200 md:static md:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex items-center justify-between px-5 py-5">
          <div className="flex items-center gap-2">
            <div className="flex size-8 items-center justify-center rounded-lg bg-primary text-sm font-bold text-primary-foreground">
              S
            </div>
            <span className="text-lg font-semibold">ServiTech</span>
          </div>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="rounded-md p-1 text-sidebar-foreground/60 hover:text-sidebar-foreground md:hidden"
            aria-label="Cerrar menú"
          >
            <X className="size-5" />
          </button>
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
    </>
  );
}
