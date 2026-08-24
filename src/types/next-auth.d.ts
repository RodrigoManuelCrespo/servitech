import type { Rol } from "@prisma/client";
import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      rol: Rol;
      empresaId: string;
    } & DefaultSession["user"];
  }

  interface User {
    rol: Rol;
    empresaId: string;
  }
}

declare module "@auth/core/jwt" {
  interface JWT {
    rol: Rol;
    empresaId: string;
  }
}
