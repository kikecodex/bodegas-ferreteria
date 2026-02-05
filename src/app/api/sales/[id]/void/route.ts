import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getTenantFromSession } from "@/lib/tenant-context";

// POST /api/sales/[id]/void - Anular venta y restaurar stock
export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const tenant = await getTenantFromSession();
        if (!tenant) {
            return NextResponse.json(
                { error: "No autenticado" },
                { status: 401 }
            );
        }

        const { id } = await params;
        const body = await request.json();
        const { reason } = body;

        // Obtener la venta con sus items
        const sale = await prisma.sale.findFirst({
            where: {
                id,
                tenantId: tenant.tenantId
            },
            include: {
                items: true
            }
        });

        if (!sale) {
            return NextResponse.json(
                { error: "Venta no encontrada" },
                { status: 404 }
            );
        }

        if (sale.status === "ANULADA") {
            return NextResponse.json(
                { error: "Esta venta ya está anulada" },
                { status: 400 }
            );
        }

        // Anular venta y restaurar stock en transacción
        const result = await prisma.$transaction(async (tx) => {
            // 1. Marcar venta como anulada
            const updatedSale = await tx.sale.update({
                where: { id },
                data: {
                    status: "ANULADA",
                    notes: sale.notes
                        ? `${sale.notes}\n[ANULADA] ${reason || "Sin razón especificada"}`
                        : `[ANULADA] ${reason || "Sin razón especificada"}`
                }
            });

            // 2. Restaurar stock de cada producto
            const stockRestored: Array<{ productId: string; productName: string; quantity: number }> = [];

            for (const item of sale.items) {
                // Obtener producto actual
                const product = await tx.product.findUnique({
                    where: { id: item.productId }
                });

                if (product) {
                    const previousStock = product.stock;
                    const newStock = product.stock + item.quantity;

                    // Actualizar stock
                    await tx.product.update({
                        where: { id: item.productId },
                        data: { stock: newStock }
                    });

                    // Registrar movimiento de stock (entrada por anulación)
                    await tx.stockMovement.create({
                        data: {
                            productId: item.productId,
                            type: "ENTRADA",
                            quantity: item.quantity,
                            previousStock,
                            newStock,
                            reason: "Anulación de venta",
                            reference: sale.number
                        }
                    });

                    stockRestored.push({
                        productId: item.productId,
                        productName: item.productName,
                        quantity: item.quantity
                    });
                }
            }

            return { sale: updatedSale, stockRestored };
        });

        return NextResponse.json({
            success: true,
            message: `Venta ${sale.number} anulada correctamente`,
            saleNumber: sale.number,
            stockRestored: result.stockRestored
        });

    } catch (error) {
        console.error("Error voiding sale:", error);
        return NextResponse.json(
            { error: "Error al anular venta" },
            { status: 500 }
        );
    }
}
