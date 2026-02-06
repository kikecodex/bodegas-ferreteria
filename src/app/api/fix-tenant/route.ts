import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/fix-tenant - Actualizar datos del tenant
export async function GET() {
    try {
        // Datos correctos de Corporación Oropeza's
        const result = await prisma.tenant.updateMany({
            data: {
                name: "YANAC LOPEZ CHRISTIAN FRANKLIN",
                tradeName: "CORPORACIÓN OROPEZA'S",
                ruc: "10712870058",
                address: "Calle Marian s/n Independencia - Huaraz",
                phone: "938408777",
                email: "corporacionoropezas@gmail.com",
                logo: "/logo.jpeg"
            }
        });

        // Verificar
        const tenants = await prisma.tenant.findMany();

        return NextResponse.json({
            success: true,
            updated: result.count,
            tenants
        });
    } catch (error) {
        console.error("Error:", error);
        return NextResponse.json({ error: String(error) }, { status: 500 });
    }
}
