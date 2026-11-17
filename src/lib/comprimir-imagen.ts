// Achica una foto en el navegador antes de subirla: una foto de celular pesa
// 3–8 MB y para ver el estado de un equipo alcanza con 1280 px.
export async function comprimirImagen(file: File): Promise<string> {
  const original = await createImageBitmap(file);
  try {
    // Si la primera pasada queda grande (foto con mucho detalle), se repite
    // más chica y con menos calidad.
    for (const [maxLado, calidad] of [
      [1280, 0.72],
      [1024, 0.55],
    ] as const) {
      const escala = Math.min(1, maxLado / Math.max(original.width, original.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(original.width * escala);
      canvas.height = Math.round(original.height * escala);
      const ctx = canvas.getContext("2d")!;
      // JPEG no tiene transparencia: sin esto, un PNG con fondo transparente
      // quedaría con fondo negro.
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(original, 0, 0, canvas.width, canvas.height);
      const dataUri = canvas.toDataURL("image/jpeg", calidad);
      if (dataUri.length < 700_000) return dataUri;
    }
    throw new Error("La foto es demasiado grande.");
  } finally {
    original.close();
  }
}
