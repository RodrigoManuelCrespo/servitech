import bcrypt from "bcryptjs";
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { prisma } from "@/lib/prisma";

// Cada cuánto se vuelve a consultar en la base si el usuario sigue activo.
const REVALIDAR_MS = 30_000;

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
      // /seguimiento/[token] es público: lo ve el cliente, que no tiene
      // cuenta en el sistema.
      return (
        nextUrl.pathname === "/login" ||
        nextUrl.pathname.startsWith("/seguimiento") ||
        !!auth?.user
      );
    },
    async jwt({ token, user }) {
      if (user) {
        token.rol = user.rol;
        token.empresaId = user.empresaId;
        token.verificadoEn = Date.now();
        return token;
      }

      // La sesión es un JWT: sin esto, un usuario desactivado seguiría
      // entrando hasta que venza el token. Se revalida contra la base cada
      // REVALIDAR_MS; devolver null hace que Auth.js borre la cookie.
      if (Date.now() - (token.verificadoEn ?? 0) > REVALIDAR_MS) {
        const usuario = await prisma.usuario.findUnique({
          where: { id: token.sub },
          select: { activo: true, rol: true },
        });
        if (!usuario?.activo) return null;
        token.rol = usuario.rol;
        token.verificadoEn = Date.now();
      }
      return token;
    },
    session({ session, token }) {
      session.user.id = token.sub as string;
      session.user.rol = token.rol;
      session.user.empresaId = token.empresaId;
      return session;
    },
  },
});
