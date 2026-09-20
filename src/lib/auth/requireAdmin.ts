import { auth } from "@/auth";
import { NextResponse } from "next/server";

    export async function requireAdmin() {
    const session = await auth();

    if (!session?.user) {
        return { error: NextResponse.json({ error: "No autenticado" }, { status: 401 }) };
    }
    if (session.user.rol !== "ADMIN") {
        return { error: NextResponse.json({ error: "Solo ADMIN" }, { status: 403 }) };
    }
    return { session };
    }