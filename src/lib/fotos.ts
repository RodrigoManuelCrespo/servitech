// Reglas de las fotos de una reparación. Las fotos se comprimen en el
// navegador y se guardan como data URI en FotoReparacion.url.

export const MAX_FOTOS = 5;

// Por foto, ya comprimida. Con 5 fotos el request del wizard queda por
// debajo del límite de 4,5 MB de las funciones de Vercel.
export const MAX_FOTO_BYTES = 600 * 1024;

const FOTO_RE = /^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/]+={0,2})$/;

export type FotoDecodificada = { tipo: string; datos: Buffer };

// Decodifica y valida una foto. No alcanza con el tipo que declara el
// cliente: se revisan los primeros bytes del archivo.
export function decodificarFoto(dataUri: string): FotoDecodificada | null {
  if (dataUri.length > Math.ceil(MAX_FOTO_BYTES / 3) * 4 + 100) return null;
  const m = FOTO_RE.exec(dataUri);
  if (!m) return null;
  const tipo = m[1];
  const datos = Buffer.from(m[2], "base64");
  if (datos.length > MAX_FOTO_BYTES) return null;

  const valido =
    tipo === "image/jpeg"
      ? datos.length > 3 && datos[0] === 0xff && datos[1] === 0xd8 && datos[2] === 0xff
      : tipo === "image/png"
        ? datos.length > 4 && datos.subarray(0, 4).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47]))
        : datos.length > 12 &&
          datos.toString("ascii", 0, 4) === "RIFF" &&
          datos.toString("ascii", 8, 12) === "WEBP";

  return valido ? { tipo, datos } : null;
}
