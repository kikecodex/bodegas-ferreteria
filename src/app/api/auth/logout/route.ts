import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// POST /api/auth/logout - Cerrar sesión
export async function POST(request: NextRequest) {
    try {
        const sessionToken = request.cookies.get("session-token")?.value;

        if (sessionToken) {
            // Eliminar sesión de la base de datos
            await prisma.session.deleteMany({
                where: { sessionToken }
            });
        }

        // Crear respuesta eliminando cookie
        const response = NextResponse.json({ success: true });

        response.cookies.set("session-token", "", {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "lax",
            expires: new Date(0),
            path: "/"
        });

        return response;
    } catch (error) {
        console.error("Error en logout:", error);
        return NextResponse.json(
            { error: "Error al cerrar sesión" },
            { status: 500 }
        );
    }
}
