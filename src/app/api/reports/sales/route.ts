import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getTenantFromSession } from "@/lib/tenant-context";

// GET /api/reports/sales - Estadísticas de ventas
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
        const period = searchParams.get("period") || "day"; // day, week, month, year

        // Usar timezone de Perú (UTC-5) para calcular fechas correctamente
        const now = new Date();
        const peruDateStr = now.toLocaleDateString('en-CA', { timeZone: 'America/Lima' }); // YYYY-MM-DD
        let startDate: Date;

        switch (period) {
            case "day":
                startDate = new Date(peruDateStr + 'T00:00:00-05:00');
                break;
            case "week": {
                const peruNow = new Date(peruDateStr + 'T12:00:00-05:00');
                const dayOfWeek = peruNow.getDay();
                startDate = new Date(peruNow);
                startDate.setDate(peruNow.getDate() - dayOfWeek);
                startDate.setHours(0, 0, 0, 0);
                // Reconstruct with Peru offset
                const weekStartStr = startDate.toLocaleDateString('en-CA', { timeZone: 'America/Lima' });
                startDate = new Date(weekStartStr + 'T00:00:00-05:00');
                break;
            }
            case "month": {
                const [y, m] = peruDateStr.split('-');
                startDate = new Date(`${y}-${m}-01T00:00:00-05:00`);
                break;
            }
            case "year": {
                const year = peruDateStr.split('-')[0];
                startDate = new Date(`${year}-01-01T00:00:00-05:00`);
                break;
            }
            default:
                startDate = new Date(peruDateStr + 'T00:00:00-05:00');
        }

        // Fin del día de hoy en Perú
        const endOfToday = new Date(peruDateStr + 'T23:59:59.999-05:00');

        // Obtener ventas del período (filtrado por tenant, excluir créditos)
        const sales = await prisma.sale.findMany({
            where: {
                createdAt: { gte: startDate, lte: endOfToday },
                status: "COMPLETADA",
                tenantId: tenant.tenantId,
                paymentMethod: { not: "CREDITO" }
            },
            select: {
                id: true,
                total: true,
                createdAt: true,
                paymentMethod: true
            }
        });

        // Calcular estadísticas
        const totalVentas = sales.reduce((sum, s) => sum + s.total, 0);
        const cantidadVentas = sales.length;
        const promedioVenta = cantidadVentas > 0 ? totalVentas / cantidadVentas : 0;

        // Ventas por método de pago
        const porMetodoPago: Record<string, { cantidad: number; total: number }> = {};
        for (const sale of sales) {
            if (!porMetodoPago[sale.paymentMethod]) {
                porMetodoPago[sale.paymentMethod] = { cantidad: 0, total: 0 };
            }
            porMetodoPago[sale.paymentMethod].cantidad++;
            porMetodoPago[sale.paymentMethod].total += sale.total;
        }

        // Ventas por hora (solo para período día)
        const ventasPorHora: Record<number, number> = {};
        if (period === "day") {
            for (const sale of sales) {
                const hour = new Date(sale.createdAt).getHours();
                ventasPorHora[hour] = (ventasPorHora[hour] || 0) + sale.total;
            }
        }

        // Obtener totales de otros períodos para comparación (filtrado por tenant)
        const todayStart = new Date(peruDateStr + 'T00:00:00-05:00');
        const [y, m] = peruDateStr.split('-');
        const peruNowForWeek = new Date(peruDateStr + 'T12:00:00-05:00');
        const dow = peruNowForWeek.getDay();
        const weekStartDate = new Date(peruNowForWeek);
        weekStartDate.setDate(peruNowForWeek.getDate() - dow);
        const weekStartStr = weekStartDate.toLocaleDateString('en-CA', { timeZone: 'America/Lima' });
        const weekStart = new Date(weekStartStr + 'T00:00:00-05:00');
        const monthStart = new Date(`${y}-${m}-01T00:00:00-05:00`);

        const [totalHoy, totalSemana, totalMes] = await Promise.all([
            prisma.sale.aggregate({
                where: {
                    createdAt: { gte: todayStart, lte: endOfToday },
                    status: "COMPLETADA",
                    tenantId: tenant.tenantId,
                    paymentMethod: { not: "CREDITO" }
                },
                _sum: { total: true },
                _count: true
            }),
            prisma.sale.aggregate({
                where: {
                    createdAt: { gte: weekStart, lte: endOfToday },
                    status: "COMPLETADA",
                    tenantId: tenant.tenantId,
                    paymentMethod: { not: "CREDITO" }
                },
                _sum: { total: true },
                _count: true
            }),
            prisma.sale.aggregate({
                where: {
                    createdAt: { gte: monthStart, lte: endOfToday },
                    status: "COMPLETADA",
                    tenantId: tenant.tenantId,
                    paymentMethod: { not: "CREDITO" }
                },
                _sum: { total: true },
                _count: true
            })
        ]);

        return NextResponse.json({
            period,
            stats: {
                totalVentas: Math.round(totalVentas * 100) / 100,
                cantidadVentas,
                promedioVenta: Math.round(promedioVenta * 100) / 100
            },
            porMetodoPago,
            ventasPorHora,
            resumen: {
                hoy: {
                    total: totalHoy._sum.total || 0,
                    cantidad: totalHoy._count
                },
                semana: {
                    total: totalSemana._sum.total || 0,
                    cantidad: totalSemana._count
                },
                mes: {
                    total: totalMes._sum.total || 0,
                    cantidad: totalMes._count
                }
            }
        });
    } catch (error) {
        console.error("Error fetching sales report:", error);
        return NextResponse.json({ error: "Error al obtener reporte" }, { status: 500 });
    }
}
