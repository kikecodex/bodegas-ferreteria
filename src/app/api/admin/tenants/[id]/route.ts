import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isSuperAdmin } from "@/lib/tenant-context";

// GET /api/admin/tenants/[id] - Obtener detalle del tenant
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const isAdmin = await isSuperAdmin();
        if (!isAdmin) {
            return NextResponse.json(
                { error: "No autorizado" },
                { status: 403 }
            );
        }

        const { id } = await params;

        const tenant = await prisma.tenant.findUnique({
            where: { id },
            include: {
                _count: {
                    select: {
                        users: true,
                        products: true,
                        sales: true,
                        clients: true,
                        suppliers: true,
                    }
                },
                payments: {
                    orderBy: { createdAt: "desc" },
                    take: 20
                },
                users: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                        role: true,
                        isActive: true
                    }
                }
            }
        });

        if (!tenant) {
            return NextResponse.json(
                { error: "Tenant no encontrado" },
                { status: 404 }
            );
        }

        return NextResponse.json({ tenant });
    } catch (error) {
        console.error("Error fetching tenant:", error);
        return NextResponse.json(
            { error: "Error al obtener tenant" },
            { status: 500 }
        );
    }
}

// PUT /api/admin/tenants/[id] - Actualizar tenant
export async function PUT(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const isAdmin = await isSuperAdmin();
        if (!isAdmin) {
            return NextResponse.json(
                { error: "No autorizado" },
                { status: 403 }
            );
        }

        const { id } = await params;
        const body = await request.json();
        const {
            name,
            ruc,
            tradeName,
            address,
            phone,
            email,
            plan,
            planExpiresAt,
            isActive
        } = body;

        // Verificar que el tenant existe
        const existing = await prisma.tenant.findUnique({
            where: { id }
        });

        if (!existing) {
            return NextResponse.json(
                { error: "Tenant no encontrado" },
                { status: 404 }
            );
        }

        // Actualizar tenant
        const tenant = await prisma.tenant.update({
            where: { id },
            data: {
                ...(name !== undefined && { name }),
                ...(ruc !== undefined && { ruc }),
                ...(tradeName !== undefined && { tradeName }),
                ...(address !== undefined && { address }),
                ...(phone !== undefined && { phone }),
                ...(email !== undefined && { email }),
                ...(plan !== undefined && { plan }),
                ...(planExpiresAt !== undefined && { planExpiresAt: new Date(planExpiresAt) }),
                ...(isActive !== undefined && { isActive }),
            }
        });

        return NextResponse.json({
            message: "Tenant actualizado",
            tenant
        });
    } catch (error) {
        console.error("Error updating tenant:", error);
        return NextResponse.json(
            { error: "Error al actualizar tenant" },
            { status: 500 }
        );
    }
}
