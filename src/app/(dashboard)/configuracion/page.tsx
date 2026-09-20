import { redirect } from "next/navigation";
import { auth } from "@/auth";
import ConfiguracionCliente from "./configuracion-cliente";

export default async function ConfiguracionPage() {
    const session = await auth();

    if (session?.user.rol !== "ADMIN") {
    redirect("/dashboard");
    }

    return <ConfiguracionCliente />;
}