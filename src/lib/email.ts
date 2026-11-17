import "server-only";
import nodemailer from "nodemailer";

// Envío de emails por SMTP. El proveedor se elige solo con variables de
// entorno (ver .env.example): Ethereal para desarrollo, Resend o Gmail en
// producción, sin cambiar código.

type Adjunto = { filename: string; content: Buffer; contentType: string };

type Email = {
  to: string;
  subject: string;
  html: string;
  text: string;
  // Nombre que ve el cliente como remitente (ej. el nombre del taller).
  fromName?: string;
  replyTo?: string;
  attachments?: Adjunto[];
};

export type ResultadoEmail = { ok: true } | { ok: false; error: string };

function crearTransporte() {
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_SECURE } = process.env;
  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) return null;
  return nodemailer.createTransport({
    host: SMTP_HOST,
    port: Number(SMTP_PORT ?? 587),
    secure: SMTP_SECURE === "true",
    auth: { user: SMTP_USER, pass: SMTP_PASS },
  });
}

// Nunca tira: devuelve ok/error para que quien llama registre el resultado
// sin que un problema del correo rompa la operación principal.
export async function enviarEmail(email: Email): Promise<ResultadoEmail> {
  const transporte = crearTransporte();
  const desde = process.env.EMAIL_FROM;
  if (!transporte || !desde) {
    return { ok: false, error: "El envío de emails no está configurado." };
  }

  try {
    const info = await transporte.sendMail({
      from: email.fromName ? { name: email.fromName, address: desde } : desde,
      to: email.to,
      replyTo: email.replyTo,
      subject: email.subject,
      html: email.html,
      text: email.text,
      attachments: email.attachments,
    });
    // Con Ethereal, link para ver el email capturado.
    const vistaPrevia = nodemailer.getTestMessageUrl(info);
    if (vistaPrevia) console.log(`[email] Vista previa: ${vistaPrevia}`);
    return { ok: true };
  } catch (error) {
    console.error("[email] Error al enviar:", error);
    return { ok: false, error: "No se pudo enviar el email." };
  }
}

// Los datos del cliente o del equipo van dentro del HTML del email: se
// escapan para que un nombre con "<" o "&" no rompa ni inyecte nada.
export function escaparHtml(texto: string): string {
  return texto
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
