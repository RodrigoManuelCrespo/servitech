# Auth.js: sesión y proxy

Cómo funciona el login, qué es un JWT, y qué protege (y qué no) el proxy que reemplaza al middleware. Pensado para leerse antes de tocar `src/auth.ts`.

## 1. El flujo completo de un login

Seis pasos, desde que apretás "Ingresar" hasta que una Server Action sabe tu `empresaId`.

1. **Enviás el formulario.** El form de login llama a `signIn("credentials", { email, password })`.
2. **Auth.js llama a `authorize()`.** Una función que escribimos nosotros en `src/auth.ts`, con esos datos como argumento.
3. **Buscamos el usuario a mano.** Con Prisma: `prisma.usuario.findUnique({ where: { email } })`, y comparamos el password con `bcrypt.compare()` contra `passwordHash`.
   ```ts
   // no existe o no matchea
   return null // el login falla

   // matchea
   return { id, name, email, rol, empresaId }
   ```
4. **Auth.js arma el JWT.** Toma ese objeto, lo firma con `AUTH_SECRET`, y lo guarda en una cookie `httpOnly` — el JavaScript del navegador no puede leerla.
5. **En cada request siguiente,** el navegador manda la cookie sola. Auth.js verifica la firma y decodifica los datos — sin volver a tocar la base.
6. **Tu código lee la sesión.** Cualquier Server Action o página hace `const session = await auth()` y ya tiene `session.user.rol` y `session.user.empresaId` disponibles.

## 2. El proxy: dos capas, no una

En Next 16 el archivo se llama `src/proxy.ts` (antes `middleware.ts`). Corre antes de renderizar cualquier página — pero no es la única defensa.

### El proxy — primera capa
- Corre **antes** de mostrar cualquier página.
- Mira la cookie de sesión — si no hay sesión válida, redirige a `/login`.
- Evita que alguien no logueado **ni siquiera vea** la pantalla.
- Se configura una sola vez, en `callbacks.authorized()` de `auth.ts`.

### Cada Server Action — última capa (la que importa)
- Se puede llamar con un POST directo, **sin pasar** por la navegación normal.
- Por eso el proxy solo no alcanza — cada Server Action vuelve a llamar `auth()` por su cuenta.
- Ahí también se valida el `rol` (¿puede un TECNICO borrar un cliente?) y se resuelve el `empresaId` **desde la sesión**, nunca del formulario.

## 3. `rol` y `empresaId` en la sesión

Por defecto Auth.js solo guarda `name`, `email` e `image`. Estos dos campos extra se copian a mano en dos momentos distintos.

`src/auth.ts`:
```ts
callbacks: {
  jwt({ token, user }) {
    // corre al crear el token, recién logueado
    if (user) {
      token.rol = user.rol
      token.empresaId = user.empresaId
    }
    return token
  },
  session({ session, token }) {
    // corre cada vez que el código pide la sesión
    session.user.rol = token.rol
    session.user.empresaId = token.empresaId
    return session
  },
}
```

Como TypeScript no conoce estos campos extra de entrada, hace falta un archivo chico (`src/types/next-auth.d.ts`) que le enseñe que `session.user` los tiene.

## 4. Los archivos, de un vistazo

| Archivo | Rol |
|---|---|
| `src/auth.ts` | La configuración: provider Credentials, `authorize()`, sesión JWT, los callbacks. |
| `src/app/api/auth/[...nextauth]/route.ts` | Expone `auth.ts` como endpoint HTTP — por acá pasan login y logout. |
| `src/proxy.ts` | Usa `auth.ts` para redirigir a `/login` si no hay sesión. |
| `src/types/next-auth.d.ts` | Le enseña a TypeScript que `session.user` tiene `rol` y `empresaId`. |

**`AUTH_SECRET`** — la clave con la que Auth.js firma los JWT. Va en `.env`, se genera una sola vez con `npx auth secret`, y **nunca se commitea** — mismo trato que `DATABASE_URL`.

---

*Documento vivo — actualizalo si el flujo cambia.*
