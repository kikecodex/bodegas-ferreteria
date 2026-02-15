import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getTenantFromSession } from "@/lib/tenant-context";

// GET /api/cash-register - Obtener caja activa
export async function GET() {
    try {
        // Obtener contexto de tenant
        const tenant = await getTenantFromSession();
        if (!tenant) {
            return NextResponse.json(
                { error: "No autenticado o tenant no válido" },
                { status: 401 }
            );
        }

        // Calcular fecha de hoy en Perú
        const now = new Date();
        const peruDateStr = now.toLocaleDateString('en-CA', { timeZone: 'America/Lima' });
        const startOfToday = new Date(peruDateStr + 'T00:00:00-05:00');

        // Buscar caja abierta (sin cerrar) del tenant
        const activeCash = await prisma.cashRegister.findFirst({
            where: {
                closedAt: null,
                tenantId: tenant.tenantId
            },
            orderBy: { openedAt: "desc" }
        });

        if (!activeCash) {
            return NextResponse.json({
                isOpen: false,
                message: "No hay caja abierta"
            });
        }

        // Verificar si la caja es de un día anterior (hora Perú)
        const openedDate = activeCash.openedAt.toLocaleDateString('en-CA', { timeZone: 'America/Lima' });
        if (openedDate !== peruDateStr) {
            // Auto-cerrar caja del día anterior
            // Calcular ventas del día en que se abrió la caja
            const openedDayStart = new Date(openedDate + 'T00:00:00-05:00');
            const openedDayEnd = new Date(openedDate + 'T23:59:59-05:00');

            const oldSales = await prisma.sale.findMany({
                where: {
                    createdAt: { gte: openedDayStart, lte: openedDayEnd },
                    status: "COMPLETADA",
                    tenantId: tenant.tenantId,
                    paymentMethod: { not: "CREDITO" }
                },
                select: { total: true }
            });

            // También incluir notas de venta del día (consistente con caja activa)
            const oldSalesNotes = await prisma.salesNote.findMany({
                where: {
                    createdAt: { gte: openedDayStart, lte: openedDayEnd },
                    status: "COMPLETADA",
                    tenantId: tenant.tenantId
                },
                select: { total: true }
            });

            const oldTotalSales = oldSales.reduce((sum, s) => sum + s.total, 0)
                + oldSalesNotes.reduce((sum, n) => sum + n.total, 0);
            const expectedAmount = activeCash.openingAmount + oldTotalSales;

            await prisma.cashRegister.update({
                where: { id: activeCash.id },
                data: {
                    closedAt: now,
                    closedBy: "auto-cierre",
                    closingAmount: expectedAmount,
                    expectedAmount,
                    difference: 0,
                    notes: (activeCash.notes ? activeCash.notes + "\n" : "") +
                        `[AUTO-CIERRE] Caja del ${openedDate} cerrada automáticamente el ${peruDateStr} por no haberse cerrado a tiempo.`
                }
            });

            return NextResponse.json({
                isOpen: false,
                autoClosedPrevious: true,
                previousDate: openedDate,
                previousOpeningAmount: activeCash.openingAmount,
                message: `La caja del ${openedDate} no fue cerrada. Se cerró automáticamente. Por favor abra una nueva caja con el monto correcto de hoy.`
            });
        }

        // Calcular ventas del día de hoy (filtrado por tenant)
        // Excluir ventas a crédito - no representan ingreso en caja
        const [sales, salesNotes, purchases] = await Promise.all([
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
            }),
            // Compras del día pagadas en EFECTIVO (salen de la caja física)
            prisma.purchase.findMany({
                where: {
                    createdAt: { gte: startOfToday },
                    status: "COMPLETADA",
                    tenantId: tenant.tenantId,
                    paymentMethod: "EFECTIVO"
                },
                select: { total: true }
            })
        ]);

        // Agrupar por método de pago (ventas + notas de venta)
        const salesByMethod: Record<string, number> = {};
        let totalSales = 0;

        for (const sale of sales) {
            salesByMethod[sale.paymentMethod] =
                (salesByMethod[sale.paymentMethod] || 0) + sale.total;
            totalSales += sale.total;
        }

        // Sumar notas de venta al total y desglose
        for (const note of salesNotes) {
            salesByMethod[note.paymentMethod] =
                (salesByMethod[note.paymentMethod] || 0) + note.total;
            totalSales += note.total;
        }

        // Restar compras en efectivo (egresos de caja física)
        const totalPurchasesCash = purchases.reduce((sum, p) => sum + p.total, 0);

        const expectedAmount = activeCash.openingAmount + totalSales - totalPurchasesCash;

        return NextResponse.json({
            isOpen: true,
            cashRegister: activeCash,
            summary: {
                openingAmount: activeCash.openingAmount,
                totalSales,
                salesByMethod,
                totalPurchasesCash,
                expectedAmount,
                salesCount: sales.length + salesNotes.length
            }
        });
    } catch (error) {
        console.error("Error fetching cash register:", error);
        return NextResponse.json(
            { error: "Error al obtener caja" },
            { status: 500 }
        );
    }
}

// POST /api/cash-register - Abrir caja
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
        const { openingAmount, notes } = body;

        // Verificar que no haya caja abierta para este tenant
        const activeCash = await prisma.cashRegister.findFirst({
            where: {
                closedAt: null,
                tenantId: tenant.tenantId
            }
        });

        if (activeCash) {
            return NextResponse.json(
                { error: "Ya existe una caja abierta. Debe cerrarla primero." },
                { status: 400 }
            );
        }

        // Crear nueva caja
        const cashRegister = await prisma.cashRegister.create({
            data: {
                openingAmount: parseFloat(openingAmount) || 0,
                openedBy: "system",
                notes: notes || null,
                tenantId: tenant.tenantId
            }
        });

        return NextResponse.json({
            message: "Caja abierta correctamente",
            cashRegister
        }, { status: 201 });
    } catch (error) {
        console.error("Error opening cash register:", error);
        return NextResponse.json(
            { error: "Error al abrir caja" },
            { status: 500 }
        );
    }
}
