import { auth, signOut } from "@/auth";

export default async function Home() {
  const session = await auth();

  return (
    <div className="flex flex-1 items-center justify-center p-6">
      <div className="w-full max-w-sm space-y-4 text-center">
        <p className="text-lg">
          Hola, <strong>{session?.user?.name}</strong>
        </p>
        <p className="text-sm text-muted-foreground">
          Rol: {session?.user?.rol} · Empresa: {session?.user?.empresaId}
        </p>
        <form
          action={async () => {
            "use server";
            await signOut({ redirectTo: "/login" });
          }}
        >
          <button
            type="submit"
            className="text-sm text-muted-foreground underline underline-offset-4 hover:text-foreground"
          >
            Cerrar sesión
          </button>
        </form>
      </div>
    </div>
  );
}
