import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getTenantFromSession } from "@/lib/tenant-context";

// GET /api/sales/[id] - Detalle de venta
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        // Obtener contexto de tenant
        const tenant = await getTenantFromSession();
        if (!tenant) {
            return NextResponse.json(
                { error: "No autenticado o tenant no válido" },
                { status: 401 }
            );
        }

        const { id } = await params;

        const sale = await prisma.sale.findFirst({
            where: {
                id,
                tenantId: tenant.tenantId
            },
            include: {
                client: true,
                user: {
                    select: {
                        id: true,
                        name: true,
                        email: true
                    }
                },
                items: {
                    include: {
                        product: {
                            select: {
                                id: true,
                                code: true,
                                name: true,
                                image: true
                            }
                        }
                    }
                }
            }
        });

        if (!sale) {
            return NextResponse.json(
                { error: "Venta no encontrada" },
                { status: 404 }
            );
        }

        return NextResponse.json(sale);
    } catch (error) {
        console.error("Error fetching sale:", error);
        return NextResponse.json(
            { error: "Error al obtener venta" },
            { status: 500 }
        );
    }
}

// PUT /api/sales/[id] - Anular venta
export async function PUT(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        // Obtener contexto de tenant
        const tenant = await getTenantFromSession();
        if (!tenant) {
            return NextResponse.json(
                { error: "No autenticado o tenant no válido" },
                { status: 401 }
            );
        }

        const { id } = await params;
        const body = await request.json();
        const { action, reason } = body;

        if (action !== "ANULAR") {
            return NextResponse.json(
                { error: "Acción no válida. Use action: 'ANULAR'" },
                { status: 400 }
            );
        }

        // Obtener venta con items (verificando tenant)
        const sale = await prisma.sale.findFirst({
            where: {
                id,
                tenantId: tenant.tenantId
            },
            include: { items: true }
        });

        if (!sale) {
            return NextResponse.json(
                { error: "Venta no encontrada" },
                { status: 404 }
            );
        }

        if (sale.status === "ANULADA") {
            return NextResponse.json(
                { error: "La venta ya está anulada" },
                { status: 400 }
            );
        }

        // Anular venta y reversar stock en transacción
        const updatedSale = await prisma.$transaction(async (tx) => {
            // 1. Actualizar estado de la venta
            const updated = await tx.sale.update({
                where: { id },
                data: {
                    status: "ANULADA",
                    notes: sale.notes
                        ? `${sale.notes}\n[ANULADA] ${reason || "Sin motivo"}`
                        : `[ANULADA] ${reason || "Sin motivo"}`
                }
            });

            // 2. Reversar stock de cada item
            for (const item of sale.items) {
                // Obtener stock actual
                const product = await tx.product.findUnique({
                    where: { id: item.productId }
                });

                if (product) {
                    const newStock = product.stock + item.quantity;

                    // Actualizar stock
                    await tx.product.update({
                        where: { id: item.productId },
                        data: { stock: newStock }
                    });

                    // Registrar movimiento
                    await tx.stockMovement.create({
                        data: {
                            productId: item.productId,
                            type: "ENTRADA",
                            quantity: item.quantity,
                            previousStock: product.stock,
                            newStock,
                            reason: "Anulación de venta",
                            reference: sale.number
                        }
                    });
                }
            }

            return updated;
        });

        return NextResponse.json({
            message: "Venta anulada correctamente",
            sale: updatedSale
        });
    } catch (error) {
        console.error("Error canceling sale:", error);
        return NextResponse.json(
            { error: "Error al anular venta" },
            { status: 500 }
        );
    }
}
