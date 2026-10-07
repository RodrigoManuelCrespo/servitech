"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";

type FormAltaProps = {
  onSuccess: () => void;
  onCancel: () => void;
};

// Formulario de alta. Vive dentro del Modal: al cerrarse el modal se desmonta
// y, al reabrirlo, los campos y el error arrancan limpios.
function FormAlta({ onSuccess, onCancel }: FormAltaProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    nombre: "",
    email: "",
    password: "",
    rol: "TECNICO",
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/usuarios", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Ocurrió un error al crear el usuario.");
      }

      router.refresh();
      onSuccess();
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Ocurrió un error inesperado al procesar la solicitud.");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div>
        <label className="block text-sm text-muted-foreground mb-1">Nombre completo</label>
        <input
          type="text"
          required
          placeholder="Ej: Juan Pérez"
          value={formData.nombre}
          onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
          className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
        />
      </div>

      <div>
        <label className="block text-sm text-muted-foreground mb-1">Email</label>
        <input
          type="email"
          required
          placeholder="correo@ejemplo.com"
          value={formData.email}
          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
        />
      </div>

      <div>
        <label className="block text-sm text-muted-foreground mb-1">Contraseña provisoria</label>
        <input
          type="password"
          required
          placeholder="••••••••"
          value={formData.password}
          onChange={(e) => setFormData({ ...formData, password: e.target.value })}
          className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
        />
      </div>

      <div>
        <label className="block text-sm text-muted-foreground mb-1">Rol</label>
        <select
          value={formData.rol}
          onChange={(e) => setFormData({ ...formData, rol: e.target.value })}
          className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
        >
          <option value="TECNICO">Técnico</option>
          <option value="ADMIN">Administrador</option>
        </select>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="flex justify-end gap-2 mt-2">
        <Button type="button" variant="ghost" onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="submit" disabled={loading}>
          {loading ? "Creando..." : "Crear usuario"}
        </Button>
      </div>
    </form>
  );
}

// Botón "Nuevo usuario" + modal de alta
export function FormUsuario() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button onClick={() => setOpen(true)}>+ Nuevo usuario</Button>

      <Modal open={open} onClose={() => setOpen(false)} title="Nuevo usuario">
        <FormAlta
          onSuccess={() => setOpen(false)}
          onCancel={() => setOpen(false)}
        />
      </Modal>
    </>
  );
}

type UsuarioEditable = {
  id: string;
  nombre: string;
  email: string;
  rol: "ADMIN" | "TECNICO";
  activo: boolean;
};

type FormEditarProps = {
  usuario: UsuarioEditable;
  onSuccess: () => void;
  onCancel: () => void;
};

// Formulario de edición. Se desmonta al cerrar el modal, así que al reabrirlo
// vuelve a arrancar con los datos actuales del usuario.
function FormEditar({ usuario, onSuccess, onCancel }: FormEditarProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    nombre: usuario.nombre,
    email: usuario.email,
    rol: usuario.rol,
    activo: usuario.activo,
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/usuarios/${usuario.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Ocurrió un error al editar el usuario.");
      }

      router.refresh();
      onSuccess();
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Ocurrió un error inesperado al procesar la solicitud.");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div>
        <label className="block text-sm text-muted-foreground mb-1">Nombre completo</label>
        <input
          type="text"
          required
          value={formData.nombre}
          onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
          className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
        />
      </div>

      <div>
        <label className="block text-sm text-muted-foreground mb-1">Email</label>
        <input
          type="email"
          required
          value={formData.email}
          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
        />
      </div>

      <div>
        <label className="block text-sm text-muted-foreground mb-1">Rol</label>
        <select
          value={formData.rol}
          onChange={(e) =>
            setFormData({ ...formData, rol: e.target.value as "ADMIN" | "TECNICO" })
          }
          className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
        >
          <option value="TECNICO">Técnico</option>
          <option value="ADMIN">Administrador</option>
        </select>
      </div>

      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={formData.activo}
          onChange={(e) => setFormData({ ...formData, activo: e.target.checked })}
          className="h-4 w-4 accent-primary"
        />
        Usuario activo
      </label>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="flex justify-end gap-2 mt-2">
        <Button type="button" variant="ghost" onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="submit" disabled={loading}>
          {loading ? "Guardando..." : "Guardar cambios"}
        </Button>
      </div>
    </form>
  );
}

// Botón "Editar" por fila + modal de edición
export function EditarUsuario({ usuario }: { usuario: UsuarioEditable }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button variant="outline" onClick={() => setOpen(true)}>
        Editar
      </Button>

      <Modal open={open} onClose={() => setOpen(false)} title="Editar usuario">
        <FormEditar
          usuario={usuario}
          onSuccess={() => setOpen(false)}
          onCancel={() => setOpen(false)}
        />
      </Modal>
    </>
  );
}
