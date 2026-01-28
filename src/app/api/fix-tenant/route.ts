import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// POST /api/fix-tenant - Create a tenant and assign to SuperAdmin
export async function POST() {
    try {
        // Find or create default tenant
        let tenant = await prisma.tenant.findFirst({
            where: { slug: "oropezas-demo" }
        });

        if (!tenant) {
            tenant = await prisma.tenant.create({
                data: {
                    name: "Corporación Oropeza's E.I.R.L.",
                    slug: "oropezas-demo",
                    ruc: "20123456789",
                    address: "Av. Principal 123, Lima",
                    phone: "999888777",
                    email: "ventas@oropezas.com",
                    plan: "PRO",
                    isActive: true,
                }
            });
        }

        // Update SuperAdmin to have this tenant
        const updatedUser = await prisma.user.updateMany({
            where: { email: "admin@sistema.com" },
            data: { tenantId: tenant.id }
        });

        return NextResponse.json({
            success: true,
            message: "Tenant asignado correctamente",
            tenant: {
                id: tenant.id,
                name: tenant.name,
                slug: tenant.slug
            },
            usersUpdated: updatedUser.count
        });
    } catch (error) {
        console.error("Error:", error);
        return NextResponse.json({ error: String(error) }, { status: 500 });
    }
}
