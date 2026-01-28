import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/update-bodega-liz-logo - Actualizar logo de Bodega Liz
export async function GET() {
    try {
        const tenant = await prisma.tenant.findFirst({
            where: { slug: "bodega-liz" }
        });

        if (!tenant) {
            return NextResponse.json({ error: "Bodega Liz no encontrada" }, { status: 404 });
        }

        const updated = await prisma.tenant.update({
            where: { id: tenant.id },
            data: {
                name: "Bodega Liz",
                logo: "/uploads/logos/bodega-liz.png",
                plan: "ACTIVO",
                isActive: true,
                planExpiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
            }
        });

        return NextResponse.json({
            success: true,
            message: "Bodega Liz actualizada con logo",
            tenant: {
                id: updated.id,
                name: updated.name,
                logo: updated.logo,
                plan: updated.plan
            }
        });
    } catch (error) {
        console.error("Error:", error);
        return NextResponse.json({ error: String(error) }, { status: 500 });
    }
}
