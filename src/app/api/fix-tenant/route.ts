import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/fix-tenant - Create tenant and assign users (easy browser access)
export async function GET() {
    return setupTenant();
}

// POST /api/fix-tenant - Create tenant and assign users
export async function POST() {
    return setupTenant();
}

async function setupTenant() {
    try {
        // Find or create Oropeza's tenant with logo
        let tenant = await prisma.tenant.findFirst({
            where: { slug: "oropezas" }
        });

        if (!tenant) {
            tenant = await prisma.tenant.create({
                data: {
                    name: "Corporación Oropeza's E.I.R.L.",
                    slug: "oropezas",
                    ruc: "20123456789",
                    tradeName: "OROPEZA'S",
                    address: "Av. Principal 123, Lima",
                    phone: "999888777",
                    email: "ventas@oropezas.com",
                    logo: "/logo.jpeg", // Logo Oropeza's
                    plan: "ACTIVO",
                    isActive: true,
                }
            });
        }

        // Update admin user
        const adminUpdate = await prisma.user.updateMany({
            where: { email: "admin@oropezas.com" },
            data: { tenantId: tenant.id }
        });

        // Update vendedor user
        const vendedorUpdate = await prisma.user.updateMany({
            where: { email: "vendedor@oropezas.com" },
            data: { tenantId: tenant.id }
        });

        return NextResponse.json({
            success: true,
            message: "Tenant Oropeza's configurado correctamente",
            tenant: {
                id: tenant.id,
                name: tenant.name,
                slug: tenant.slug,
                logo: tenant.logo
            },
            usersUpdated: {
                admin: adminUpdate.count,
                vendedor: vendedorUpdate.count
            }
        });
    } catch (error) {
        console.error("Error:", error);
        return NextResponse.json({ error: String(error) }, { status: 500 });
    }
}

