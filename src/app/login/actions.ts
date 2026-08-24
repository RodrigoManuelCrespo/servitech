"use server";

import { AuthError } from "next-auth";
import { signIn } from "@/auth";

export type LoginState = { error?: string; email?: string } | undefined;

export async function login(
  _prevState: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const email = formData.get("email");
  const password = formData.get("password");

  if (typeof email !== "string" || typeof password !== "string") {
    return { error: "Completá email y contraseña." };
  }

  try {
    await signIn("credentials", {
      email,
      password,
      redirectTo: "/",
    });
  } catch (error) {
    if (error instanceof AuthError) {
      // El input de email no es controlado por React: al no pasarle
      // defaultValue, Next.js lo vacía en el re-render posterior a esta
      // acción y el `required` bloquea silenciosamente el reintento.
      // Devolvemos el email enviado para repoblarlo.
      return { error: "Email o contraseña incorrectos.", email };
    }
    throw error;
  }
}
