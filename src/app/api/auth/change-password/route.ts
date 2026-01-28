import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

// POST /api/auth/change-password - Cambiar contraseña
export async function POST(request: NextRequest) {
    try {
        const sessionToken = request.cookies.get("session")?.value;

        if (!sessionToken) {
            return NextResponse.json({ error: "No autenticado" }, { status: 401 });
        }

        // Validar sesión
        const session = await prisma.session.findUnique({
            where: { sessionToken },
            include: { user: true }
        });

        if (!session || session.expires < new Date()) {
            return NextResponse.json({ error: "Sesión inválida" }, { status: 401 });
        }

        const { currentPassword, newPassword } = await request.json();

        if (!currentPassword || !newPassword) {
            return NextResponse.json(
                { error: "Contraseña actual y nueva son requeridas" },
                { status: 400 }
            );
        }

        if (newPassword.length < 6) {
            return NextResponse.json(
                { error: "La nueva contraseña debe tener al menos 6 caracteres" },
                { status: 400 }
            );
        }

        // Verificar contraseña actual
        const validPassword = await bcrypt.compare(currentPassword, session.user.password);
        if (!validPassword) {
            return NextResponse.json(
                { error: "Contraseña actual incorrecta" },
                { status: 400 }
            );
        }

        // Hash de nueva contraseña  
        const hashedPassword = await bcrypt.hash(newPassword, 10);

        // Actualizar contraseña
        await prisma.user.update({
            where: { id: session.user.id },
            data: { password: hashedPassword }
        });

        return NextResponse.json({
            success: true,
            message: "Contraseña actualizada correctamente"
        });
    } catch (error) {
        console.error("Error cambiando contraseña:", error);
        return NextResponse.json(
            { error: "Error al cambiar contraseña" },
            { status: 500 }
        );
    }
}
