import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getTenantFromSession } from "@/lib/tenant-context";

// GET /api/reports/daily-cash - Reporte de caja diaria (historial)
export async function GET(request: NextRequest) {
    try {
        const tenant = await getTenantFromSession();
        if (!tenant) {
            return NextResponse.json(
                { error: "No autenticado o tenant no válido" },
                { status: 401 }
            );
        }

        const { searchParams } = new URL(request.url);
        const dateFrom = searchParams.get("dateFrom");
        const dateTo = searchParams.get("dateTo");

        // Construir filtro
        const where: Record<string, unknown> = {
            tenantId: tenant.tenantId,
        };

        const openedAtFilter: Record<string, Date> = {};
        if (dateFrom) {
            openedAtFilter.gte = new Date(dateFrom + "T00:00:00-05:00");
        }
        if (dateTo) {
            openedAtFilter.lte = new Date(dateTo + "T23:59:59.999-05:00");
        }
        if (Object.keys(openedAtFilter).length > 0) {
            where.openedAt = openedAtFilter;
        }

        // Obtener todas las cajas del período
        const cashRegisters = await prisma.cashRegister.findMany({
            where,
            orderBy: { openedAt: "desc" },
            take: 100,
        });

        // Para cada caja cerrada, obtener desglose de ventas
        const registersWithDetails = await Promise.all(
            cashRegisters.map(async (cr) => {
                // Determinar rango temporal de la caja
                const dayStr = cr.openedAt.toLocaleDateString("en-CA", {
                    timeZone: "America/Lima",
                });
                const dayStart = new Date(dayStr + "T00:00:00-05:00");
                const dayEnd = cr.closedAt || new Date(dayStr + "T23:59:59.999-05:00");

                // Obtener ventas y notas de venta del turno
                const [sales, salesNotes] = await Promise.all([
                    prisma.sale.findMany({
                        where: {
                            createdAt: { gte: dayStart, lte: dayEnd },
                            status: "COMPLETADA",
                            tenantId: tenant.tenantId,
                            paymentMethod: { not: "CREDITO" },
                        },
                        select: {
                            id: true,
                            number: true,
                            total: true,
                            paymentMethod: true,
                            documentType: true,
                            createdAt: true,
                            client: {
                                select: { name: true },
                            },
                        },
                        orderBy: { createdAt: "asc" },
                    }),
                    prisma.salesNote.findMany({
                        where: {
                            createdAt: { gte: dayStart, lte: dayEnd },
                            status: "COMPLETADA",
                            tenantId: tenant.tenantId,
                        },
                        select: {
                            id: true,
                            number: true,
                            total: true,
                            paymentMethod: true,
                            createdAt: true,
                            client: {
                                select: { name: true },
                            },
                        },
                        orderBy: { createdAt: "asc" },
                    }),
                ]);

                // Desglose por método de pago
                const salesByMethod: Record<string, number> = {};
                let totalSales = 0;

                for (const sale of sales) {
                    salesByMethod[sale.paymentMethod] =
                        (salesByMethod[sale.paymentMethod] || 0) + sale.total;
                    totalSales += sale.total;
                }
                for (const note of salesNotes) {
                    salesByMethod[note.paymentMethod] =
                        (salesByMethod[note.paymentMethod] || 0) + note.total;
                    totalSales += note.total;
                }

                return {
                    id: cr.id,
                    openedAt: cr.openedAt,
                    closedAt: cr.closedAt,
                    openingAmount: cr.openingAmount,
                    closingAmount: cr.closingAmount,
                    expectedAmount: cr.expectedAmount,
                    difference: cr.difference,
                    openedBy: cr.openedBy,
                    closedBy: cr.closedBy,
                    notes: cr.notes,
                    isClosed: !!cr.closedAt,
                    // Datos calculados
                    totalSales,
                    salesCount: sales.length + salesNotes.length,
                    salesByMethod,
                    sales: sales.map((s) => ({
                        id: s.id,
                        number: s.number,
                        total: s.total,
                        paymentMethod: s.paymentMethod,
                        documentType: s.documentType,
                        client: s.client?.name || "Cliente general",
                        createdAt: s.createdAt,
                    })),
                    salesNotes: salesNotes.map((n) => ({
                        id: n.id,
                        number: n.number,
                        total: n.total,
                        paymentMethod: n.paymentMethod,
                        documentType: "NOTA_VENTA",
                        client: n.client?.name || "Cliente general",
                        createdAt: n.createdAt,
                    })),
                };
            })
        );

        // KPIs globales
        const cajasCerradas = registersWithDetails.filter((r) => r.isClosed);
        const totalIngresos = cajasCerradas.reduce(
            (sum, r) => sum + r.totalSales,
            0
        );
        const diferenciaAcumulada = cajasCerradas.reduce(
            (sum, r) => sum + (r.difference || 0),
            0
        );
        const cajasConSobrante = cajasCerradas.filter(
            (r) => (r.difference || 0) > 0.01
        ).length;
        const cajasConFaltante = cajasCerradas.filter(
            (r) => (r.difference || 0) < -0.01
        ).length;
        const cajasCuadradas = cajasCerradas.filter(
            (r) => Math.abs(r.difference || 0) <= 0.01
        ).length;

        return NextResponse.json({
            registers: registersWithDetails,
            kpis: {
                totalCajas: cashRegisters.length,
                cajasCerradas: cajasCerradas.length,
                cajasAbiertas: cashRegisters.length - cajasCerradas.length,
                totalIngresos,
                diferenciaAcumulada,
                cajasConSobrante,
                cajasConFaltante,
                cajasCuadradas,
            },
        });
    } catch (error) {
        console.error("Error fetching daily cash report:", error);
        return NextResponse.json(
            { error: "Error al generar reporte de caja diaria" },
            { status: 500 }
        );
    }
}
