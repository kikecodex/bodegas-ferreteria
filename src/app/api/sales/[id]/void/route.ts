import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getTenantFromSession } from "@/lib/tenant-context";

// POST /api/sales/[id]/void - ELIMINAR venta permanentemente y restaurar stock
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

        const saleNumber = sale.number;

        // ELIMINAR venta y restaurar stock en transacción
        const result = await prisma.$transaction(async (tx) => {
            // 1. Restaurar stock de cada producto ANTES de eliminar
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

                    // Registrar movimiento de stock (entrada por eliminación de venta duplicada)
                    await tx.stockMovement.create({
                        data: {
                            productId: item.productId,
                            type: "ENTRADA",
                            quantity: item.quantity,
                            previousStock,
                            newStock,
                            reason: reason || "Eliminación de venta duplicada",
                            reference: saleNumber
                        }
                    });

                    stockRestored.push({
                        productId: item.productId,
                        productName: item.productName,
                        quantity: item.quantity
                    });
                }
            }

            // 2. Eliminar items de la venta
            await tx.saleItem.deleteMany({
                where: { saleId: id }
            });

            // 3. Eliminar la venta permanentemente
            await tx.sale.delete({
                where: { id }
            });

            return { stockRestored };
        });

        return NextResponse.json({
            success: true,
            message: `Venta ${saleNumber} eliminada permanentemente`,
            saleNumber: saleNumber,
            stockRestored: result.stockRestored
        });

    } catch (error) {
        console.error("Error deleting sale:", error);
        return NextResponse.json(
            { error: "Error al eliminar venta" },
            { status: 500 }
        );
    }
}
