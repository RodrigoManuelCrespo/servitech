# Migraciones con Prisma

Guía interna: cómo pasamos cambios del modelo de datos a Neon sin pisarnos entre todos. Comandos, quién corre cada uno, y un ejemplo real de punta a punta.

## 1. Por qué esto no es como Mongo

En Mongo, una colección se crea sola la primera vez que insertás un documento. En Postgres, la tabla tiene que existir **antes** de poder guardar una fila — por eso necesitamos un paso extra que arme esa estructura primero.

| | MongoDB | Postgres |
|---|---|---|
| **Estructura** | Flexible por documento. Mongoose la impone desde el código, no la base. | Fija y tipada. Cada columna existe en la base misma, no solo en el código. |
| **Tabla/colección nueva** | Se crea sola al insertar el primer documento. | Hay que crearla explícitamente antes de insertar nada. |
| **Historial de cambios** | No existe un concepto formal — el schema vive solo en el código de la app. | Cada cambio de estructura queda versionado como **migración**, en `prisma/migrations/`. |

## 2. Comandos

Los seis comandos que vamos a usar en todo el proyecto. No hace falta memorizarlos — volvé a esta tabla cuando dudes.

| Comando | Qué hace | Quién lo corre |
|---|---|---|
| `npx prisma migrate dev --name x` | Compara el schema contra la base, genera el SQL del cambio, lo aplica, y regenera el cliente. | **Quien cambia el schema** |
| `npx prisma migrate deploy` | Aplica las migraciones que ya existen en el repo. No genera ninguna nueva. | **El resto del equipo** |
| `npx prisma generate` | Regenera el cliente TypeScript a partir de tu `schema.prisma` local. No toca la base. | **El resto del equipo** |
| `npx prisma migrate status` | Te dice si tu base está al día con las migraciones o falta aplicar algo. | Cualquiera |
| `npx prisma validate` | Chequea que el `schema.prisma` esté bien escrito. No toca la base. | Cualquiera |
| `npx prisma studio` | Abre una GUI web para ver y editar filas — el equivalente a Compass en Mongo. | Cualquiera |

## 3. El flujo, en dos caminos

Todos apuntamos a la **misma** base de Neon. Por eso el camino es distinto según si vos generás el cambio o si lo recibís de otra persona.

### Si vos tocás una tabla (autor del cambio)

1. **Partí actualizado.** Bajá lo último de `dev` antes de tocar nada.
   ```bash
   git checkout dev
   git pull
   git checkout -b feature/mi-cambio
   ```
2. **Editá** `prisma/schema.prisma` a mano.
3. **Migrá.** Esto ya aplica el cambio a la base compartida.
   ```bash
   npx prisma migrate dev --name mi_cambio
   ```
4. Probá en local que anda (`npm run dev`).
5. **Commiteá los dos juntos** — el schema y la migración nunca van separados.
   ```bash
   git add prisma/schema.prisma prisma/migrations/
   git commit -m "..."
   git push
   ```
6. Abrí el PR contra `dev`, **avisá al grupo**, y mergealo rápido.

### Si alguien más la tocó (el resto)

1. Bajá los cambios de `dev`.
   ```bash
   git checkout dev
   git pull
   ```
2. Sincronizá la base (en este caso casi seguro ya está aplicada, pero es el paso correcto y seguro para correr siempre).
   ```bash
   npx prisma migrate deploy
   ```
3. **Este es el que de verdad te hace falta:** tu editor no conoce la tabla nueva hasta que regenerás el cliente.
   ```bash
   npx prisma generate
   ```
4. Listo — seguís trabajando con la base y el cliente sincronizados.

### Regla de oro: uno a la vez

Como todos apuntan a la misma base de Neon (no hay una copia por persona), dos cambios de schema en simultáneo se pueden pisar y en el peor caso Prisma llega a proponer resetear la base.

- Avisá antes de tocar `schema.prisma`.
- Partí siempre de `dev` recién actualizado.
- Mergeá el PR del cambio rápido, no lo dejes abierto.

## 4. Ejemplo real: agregar `Proveedor`

Los dos caminos de arriba, aplicados a un caso concreto: agregar una tabla nueva para los proveedores de repuestos.

`prisma/schema.prisma`:
```prisma
model Proveedor {
  id        String   @id @default(cuid())
  empresaId String
  empresa   Empresa  @relation(fields: [empresaId], references: [id])
  nombre    String
  telefono  String?
  createdAt DateTime @default(now())

  @@index([empresaId])
}
```

1. **Autor** corre la migración — esto ya crea la tabla en Neon:
   ```bash
   npx prisma migrate dev --name agregar_proveedor
   ```
2. **Autor** commitea y abre el PR:
   ```bash
   git add prisma/schema.prisma prisma/migrations/
   git commit -m "Agregar modelo Proveedor"
   git push -u origin feature/tabla-proveedores
   ```
3. **El resto**, después de mergeado, se pone al día:
   ```bash
   git pull
   npx prisma migrate deploy
   npx prisma generate
   ```
4. Ahora cualquiera puede usar `prisma.proveedor.findMany()` con autocompletado y tipos correctos.

---

*Documento vivo — actualizalo si el flujo cambia.*
