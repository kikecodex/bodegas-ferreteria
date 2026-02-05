import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getTenantFromSession } from "@/lib/tenant-context";

// DELETE /api/sales/delete-voided - Eliminar permanentemente todas las ventas ANULADAS
export async function DELETE(request: NextRequest) {
    try {
        const tenant = await getTenantFromSession();
        if (!tenant) {
            return NextResponse.json(
                { error: "No autenticado" },
                { status: 401 }
            );
        }

        // Contar ventas anuladas antes de eliminar
        const voidedSales = await prisma.sale.findMany({
            where: {
                tenantId: tenant.tenantId,
                status: "ANULADA"
            },
            select: { id: true, number: true }
        });

        if (voidedSales.length === 0) {
            return NextResponse.json({
                success: true,
                message: "No hay ventas anuladas para eliminar",
                deletedCount: 0
            });
        }

        const saleIds = voidedSales.map(s => s.id);

        // Eliminar en transacción
        await prisma.$transaction(async (tx) => {
            // 1. Eliminar items de ventas anuladas
            await tx.saleItem.deleteMany({
                where: { saleId: { in: saleIds } }
            });

            // 2. Eliminar las ventas anuladas
            await tx.sale.deleteMany({
                where: { id: { in: saleIds } }
            });
        });

        return NextResponse.json({
            success: true,
            message: `${voidedSales.length} ventas anuladas eliminadas permanentemente`,
            deletedCount: voidedSales.length,
            deletedNumbers: voidedSales.map(s => s.number)
        });

    } catch (error) {
        console.error("Error deleting voided sales:", error);
        return NextResponse.json(
            { error: "Error al eliminar ventas anuladas" },
            { status: 500 }
        );
    }
}

// GET - Obtener conteo de ventas anuladas
export async function GET() {
    try {
        const tenant = await getTenantFromSession();
        if (!tenant) {
            return NextResponse.json(
                { error: "No autenticado" },
                { status: 401 }
            );
        }

        const count = await prisma.sale.count({
            where: {
                tenantId: tenant.tenantId,
                status: "ANULADA"
            }
        });

        return NextResponse.json({
            voidedCount: count
        });

    } catch (error) {
        console.error("Error counting voided sales:", error);
        return NextResponse.json(
            { error: "Error al contar ventas anuladas" },
            { status: 500 }
        );
    }
}
