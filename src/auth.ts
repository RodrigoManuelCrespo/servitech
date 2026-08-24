import bcrypt from "bcryptjs";
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { prisma } from "@/lib/prisma";

export const { handlers, auth, signIn, signOut } = NextAuth({
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  trustHost: true,
  providers: [
    Credentials({
      credentials: {
        email: {},
        password: {},
      },
      authorize: async (credentials) => {
        const email = credentials?.email;
        const password = credentials?.password;
        if (typeof email !== "string" || typeof password !== "string") {
          return null;
        }

        const usuario = await prisma.usuario.findUnique({ where: { email } });
        if (!usuario || !usuario.activo) return null;

        const valid = await bcrypt.compare(password, usuario.passwordHash);
        if (!valid) return null;

        return {
          id: usuario.id,
          name: usuario.nombre,
          email: usuario.email,
          rol: usuario.rol,
          empresaId: usuario.empresaId,
        };
      },
    }),
  ],
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      return nextUrl.pathname === "/login" || !!auth?.user;
    },
    jwt({ token, user }) {
      if (user) {
        token.rol = user.rol;
        token.empresaId = user.empresaId;
      }
      return token;
    },
    session({ session, token }) {
      session.user.rol = token.rol;
      session.user.empresaId = token.empresaId;
      return session;
    },
  },
});
