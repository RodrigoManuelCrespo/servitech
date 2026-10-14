import SeguimientoClient from "./seguimiento-client";

export default async function SeguimientoPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  return <SeguimientoClient token={token} />;
}
