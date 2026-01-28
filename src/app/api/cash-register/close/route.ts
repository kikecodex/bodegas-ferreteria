import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getTenantFromSession } from "@/lib/tenant-context";

// POST /api/cash-register/close - Cerrar caja
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
        const { closingAmount, notes } = body;

        // Buscar caja abierta del tenant
        const activeCash = await prisma.cashRegister.findFirst({
            where: {
                closedAt: null,
                tenantId: tenant.tenantId
            },
            orderBy: { openedAt: "desc" }
        });

        if (!activeCash) {
            return NextResponse.json(
                { error: "No hay caja abierta para cerrar" },
                { status: 400 }
            );
        }

        // Calcular ventas en efectivo (filtrado por tenant)
        const sales = await prisma.sale.findMany({
            where: {
                createdAt: { gte: activeCash.openedAt },
                status: "COMPLETADA",
                tenantId: tenant.tenantId
            },
            select: {
                total: true,
                paymentMethod: true
            }
        });

        let cashSales = 0;
        const salesByMethod: Record<string, number> = {};

        for (const sale of sales) {
            salesByMethod[sale.paymentMethod] =
                (salesByMethod[sale.paymentMethod] || 0) + sale.total;
            if (sale.paymentMethod === "EFECTIVO") {
                cashSales += sale.total;
            }
        }

        const expectedAmount = activeCash.openingAmount + cashSales;
        const actualClosing = parseFloat(closingAmount) || 0;
        const difference = actualClosing - expectedAmount;

        // Cerrar caja
        const closedCash = await prisma.cashRegister.update({
            where: { id: activeCash.id },
            data: {
                closingAmount: actualClosing,
                expectedAmount,
                difference,
                closedAt: new Date(),
                closedBy: "system",
                notes: notes
                    ? (activeCash.notes ? `${activeCash.notes}\n${notes}` : notes)
                    : activeCash.notes
            }
        });

        return NextResponse.json({
            message: "Caja cerrada correctamente",
            cashRegister: closedCash,
            summary: {
                openingAmount: activeCash.openingAmount,
                cashSales,
                expectedAmount,
                closingAmount: actualClosing,
                difference,
                differenceType: difference > 0 ? "SOBRANTE" : difference < 0 ? "FALTANTE" : "CUADRADO",
                salesByMethod,
                totalSales: Object.values(salesByMethod).reduce((a, b) => a + b, 0),
                salesCount: sales.length
            }
        });
    } catch (error) {
        console.error("Error closing cash register:", error);
        return NextResponse.json(
            { error: "Error al cerrar caja" },
            { status: 500 }
        );
    }
}
