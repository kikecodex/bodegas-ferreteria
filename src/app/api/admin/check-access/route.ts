import { NextResponse } from "next/server";
import { isSuperAdmin } from "@/lib/tenant-context";

// GET /api/admin/check-access - Verificar si el usuario es SuperAdmin
export async function GET() {
    try {
        const isAdmin = await isSuperAdmin();

        if (!isAdmin) {
            return NextResponse.json(
                { isSuperAdmin: false, error: "No autorizado" },
                { status: 403 }
            );
        }

        return NextResponse.json({ isSuperAdmin: true });
    } catch (error) {
        console.error("Error checking admin access:", error);
        return NextResponse.json(
            { isSuperAdmin: false, error: "Error de autenticación" },
            { status: 500 }
        );
    }
}
