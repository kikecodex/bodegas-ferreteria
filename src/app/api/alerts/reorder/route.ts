import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getTenantFromSession } from "@/lib/tenant-context";

// GET /api/alerts/reorder - Lista alertas de reorden
export async function GET(request: NextRequest) {
    try {
        // Obtener contexto de tenant
        const tenant = await getTenantFromSession();
        if (!tenant) {
            return NextResponse.json(
                { error: "No autenticado o tenant no válido" },
                { status: 401 }
            );
        }

        const { searchParams } = new URL(request.url);
        const status = searchParams.get("status") || "PENDING";
        const limit = parseInt(searchParams.get("limit") || "50");

        // Construir where con filtrado por tenant
        const where: Record<string, unknown> = {
            tenantId: tenant.tenantId
        };
        if (status !== "ALL") {
            where.status = status;
        }

        const alerts = await prisma.reorderAlert.findMany({
            where,
            include: {
                product: {
                    select: {
                        id: true,
                        code: true,
                        name: true,
                        stock: true,
                        minStock: true,
                        reorderPoint: true,
                        preferredVendor: true,
                        unit: true,
                        category: {
                            select: { name: true, color: true }
                        }
                    }
                }
            },
            orderBy: [
                { status: "asc" },
                { createdAt: "desc" }
            ],
            take: limit
        });

        // Contar por estado (filtrado por tenant)
        const counts = await prisma.reorderAlert.groupBy({
            by: ["status"],
            where: { tenantId: tenant.tenantId },
            _count: { status: true }
        });

        const countsByStatus = counts.reduce((acc, item) => {
            acc[item.status] = item._count.status;
            return acc;
        }, {} as Record<string, number>);

        return NextResponse.json({
            alerts,
            counts: {
                PENDING: countsByStatus.PENDING || 0,
                ACKNOWLEDGED: countsByStatus.ACKNOWLEDGED || 0,
                ORDERED: countsByStatus.ORDERED || 0,
                RESOLVED: countsByStatus.RESOLVED || 0
            }
        });
    } catch (error) {
        console.error("Error fetching reorder alerts:", error);
        return NextResponse.json(
            { error: "Error al obtener alertas" },
            { status: 500 }
        );
    }
}

// POST /api/alerts/reorder - Crea una alerta manual
export async function POST(request: NextRequest) {
    try {
        // Obtener contexto de tenant
        const tenant = await getTenantFromSession();
        if (!tenant) {
            return NextResponse.json(
                { error: "No autenticado o tenant no válido" },
                { status: 401 }
            );
        }

        const body = await request.json();
        const { productId, type, notes } = body;

        if (!productId) {
            return NextResponse.json(
                { error: "ID de producto es requerido" },
                { status: 400 }
            );
        }

        // Verificar producto existe y pertenece al tenant
        const product = await prisma.product.findFirst({
            where: {
                id: productId,
                tenantId: tenant.tenantId
            }
        });

        if (!product) {
            return NextResponse.json(
                { error: "Producto no encontrado" },
                { status: 404 }
            );
        }

        // Verificar si ya existe una alerta pendiente
        const existing = await prisma.reorderAlert.findFirst({
            where: {
                productId,
                status: "PENDING",
                tenantId: tenant.tenantId
            }
        });

        if (existing) {
            return NextResponse.json(
                { error: "Ya existe una alerta pendiente para este producto", existing },
                { status: 409 }
            );
        }

        const alert = await prisma.reorderAlert.create({
            data: {
                productId,
                type: type || "REORDER_POINT",
                currentStock: product.stock,
                minStock: product.minStock,
                reorderPoint: product.reorderPoint,
                notes: notes || null,
                tenantId: tenant.tenantId
            },
            include: {
                product: {
                    select: { code: true, name: true }
                }
            }
        });

        return NextResponse.json(alert, { status: 201 });
    } catch (error) {
        console.error("Error creating reorder alert:", error);
        return NextResponse.json(
            { error: "Error al crear alerta" },
            { status: 500 }
        );
    }
}
