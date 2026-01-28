import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/fix-superadmin - Corregir SuperAdmin para que no tenga tenant
export async function GET() {
    try {
        // Buscar el SuperAdmin
        const superAdmin = await prisma.user.findFirst({
            where: { email: "admin@sistema.com" }
        });

        if (!superAdmin) {
            return NextResponse.json({
                error: "SuperAdmin no encontrado",
                hint: "Ejecuta POST /api/seed-superadmin primero"
            }, { status: 404 });
        }

        // Mostrar estado actual
        const currentState = {
            id: superAdmin.id,
            email: superAdmin.email,
            role: superAdmin.role,
            tenantId: superAdmin.tenantId,
            hasTenant: superAdmin.tenantId !== null
        };

        // Si tiene tenant, corregirlo
        if (superAdmin.tenantId !== null || superAdmin.role !== "SUPERADMIN") {
            await prisma.user.update({
                where: { id: superAdmin.id },
                data: {
                    tenantId: null,
                    role: "SUPERADMIN"
                }
            });

            return NextResponse.json({
                success: true,
                message: "SuperAdmin corregido exitosamente",
                before: currentState,
                after: {
                    ...currentState,
                    tenantId: null,
                    role: "SUPERADMIN",
                    hasTenant: false
                },
                action: "Ahora cierra sesión e inicia con admin@sistema.com / admin123"
            });
        }

        return NextResponse.json({
            success: true,
            message: "SuperAdmin ya está correctamente configurado",
            state: currentState,
            hint: "Si sigue sin funcionar, borra las cookies del navegador y vuelve a iniciar sesión"
        });

    } catch (error) {
        console.error("Error fixing superadmin:", error);
        return NextResponse.json(
            { error: "Error al corregir superadmin" },
            { status: 500 }
        );
    }
}
