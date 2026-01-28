import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/activate-tenant/[id] - Activar suscripción de un tenant
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;

        // Buscar el tenant
        const tenant = await prisma.tenant.findUnique({
            where: { id }
        });

        if (!tenant) {
            // Intentar buscar por slug
            const tenantBySlug = await prisma.tenant.findFirst({
                where: { slug: id }
            });

            if (!tenantBySlug) {
                return NextResponse.json(
                    { error: "Tenant no encontrado" },
                    { status: 404 }
                );
            }

            // Activar por slug
            const activated = await prisma.tenant.update({
                where: { id: tenantBySlug.id },
                data: {
                    plan: "ACTIVO",
                    isActive: true,
                    planExpiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 días
                }
            });

            return NextResponse.json({
                success: true,
                message: `Tenant "${activated.name}" activado por 30 días`,
                tenant: {
                    id: activated.id,
                    name: activated.name,
                    plan: activated.plan,
                    planExpiresAt: activated.planExpiresAt
                }
            });
        }

        // Activar el tenant
        const activated = await prisma.tenant.update({
            where: { id },
            data: {
                plan: "ACTIVO",
                isActive: true,
                planExpiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 días
            }
        });

        return NextResponse.json({
            success: true,
            message: `Tenant "${activated.name}" activado por 30 días`,
            tenant: {
                id: activated.id,
                name: activated.name,
                plan: activated.plan,
                planExpiresAt: activated.planExpiresAt
            }
        });

    } catch (error) {
        console.error("Error activating tenant:", error);
        return NextResponse.json(
            { error: "Error al activar tenant" },
            { status: 500 }
        );
    }
}
