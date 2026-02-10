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

        // Calcular inicio del día en Perú (medianoche) para coincidir con reportes
        const now = new Date();
        const peruDateStr = now.toLocaleDateString('en-CA', { timeZone: 'America/Lima' });
        const startOfToday = new Date(peruDateStr + 'T00:00:00-05:00');

        // Calcular ventas del día de hoy (filtrado por tenant)
        // Excluir ventas a crédito - no representan ingreso en caja
        const [sales, salesNotes] = await Promise.all([
            prisma.sale.findMany({
                where: {
                    createdAt: { gte: startOfToday },
                    status: "COMPLETADA",
                    tenantId: tenant.tenantId,
                    paymentMethod: { not: "CREDITO" }
                },
                select: {
                    total: true,
                    paymentMethod: true
                }
            }),
            prisma.salesNote.findMany({
                where: {
                    createdAt: { gte: startOfToday },
                    status: "COMPLETADA",
                    tenantId: tenant.tenantId
                },
                select: {
                    total: true,
                    paymentMethod: true
                }
            })
        ]);

        const salesByMethod: Record<string, number> = {};
        let totalSales = 0;

        for (const sale of sales) {
            salesByMethod[sale.paymentMethod] =
                (salesByMethod[sale.paymentMethod] || 0) + sale.total;
            totalSales += sale.total;
        }

        // Sumar notas de venta
        for (const note of salesNotes) {
            salesByMethod[note.paymentMethod] =
                (salesByMethod[note.paymentMethod] || 0) + note.total;
            totalSales += note.total;
        }

        const expectedAmount = activeCash.openingAmount + totalSales;
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
                cashSales: salesByMethod["EFECTIVO"] || 0,
                expectedAmount,
                closingAmount: actualClosing,
                difference,
                differenceType: Math.abs(difference) < 0.01 ? "CUADRADO" : difference > 0 ? "SOBRANTE" : "FALTANTE",
                salesByMethod,
                totalSales,
                salesCount: sales.length + salesNotes.length
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
