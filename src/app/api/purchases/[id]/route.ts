import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getTenantFromSession } from "@/lib/tenant-context";

// DELETE /api/purchases/[id] - Eliminar compra con reversión de stock
export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const tenant = await getTenantFromSession();
        if (!tenant) {
            return NextResponse.json(
                { error: "No autenticado o tenant no válido" },
                { status: 401 }
            );
        }

        const { id } = await params;

        // Buscar compra con sus items
        const purchase = await prisma.purchase.findFirst({
            where: {
                id,
                tenantId: tenant.tenantId,
            },
            include: {
                items: true,
            },
        });

        if (!purchase) {
            return NextResponse.json(
                { error: "Compra no encontrada" },
                { status: 404 }
            );
        }

        // Transacción: revertir stock y eliminar compra
        await prisma.$transaction(async (tx) => {
            // 1. Revertir stock de cada producto
            for (const item of purchase.items) {
                const product = await tx.product.findUnique({
                    where: { id: item.productId },
                });

                if (product) {
                    const newStock = Math.max(0, product.stock - item.quantity);

                    await tx.product.update({
                        where: { id: item.productId },
                        data: { stock: newStock },
                    });

                    // Registrar movimiento de stock inverso
                    await tx.stockMovement.create({
                        data: {
                            productId: item.productId,
                            type: "SALIDA",
                            quantity: item.quantity,
                            previousStock: product.stock,
                            newStock,
                            reason: "Eliminación de compra",
                            reference: purchase.number,
                        },
                    });
                }
            }

            // 2. Eliminar items de la compra
            await tx.purchaseItem.deleteMany({
                where: { purchaseId: id },
            });

            // 3. Eliminar la compra
            await tx.purchase.delete({
                where: { id },
            });
        });

        return NextResponse.json({ success: true, message: "Compra eliminada y stock revertido" });
    } catch (error) {
        console.error("Error deleting purchase:", error);
        return NextResponse.json(
            { error: "Error al eliminar compra" },
            { status: 500 }
        );
    }
}
