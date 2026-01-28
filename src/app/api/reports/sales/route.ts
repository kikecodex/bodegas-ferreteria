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

        // Calcular fecha de inicio según período
        const now = new Date();
        let startDate: Date;

        switch (period) {
            case "day":
                startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
                break;
            case "week":
                const dayOfWeek = now.getDay();
                startDate = new Date(now);
                startDate.setDate(now.getDate() - dayOfWeek);
                startDate.setHours(0, 0, 0, 0);
                break;
            case "month":
                startDate = new Date(now.getFullYear(), now.getMonth(), 1);
                break;
            case "year":
                startDate = new Date(now.getFullYear(), 0, 1);
                break;
            default:
                startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        }

        // Obtener ventas del período (filtrado por tenant)
        const sales = await prisma.sale.findMany({
            where: {
                createdAt: { gte: startDate },
                status: "COMPLETADA",
                tenantId: tenant.tenantId
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
        const [totalHoy, totalSemana, totalMes] = await Promise.all([
            prisma.sale.aggregate({
                where: {
                    createdAt: { gte: new Date(now.getFullYear(), now.getMonth(), now.getDate()) },
                    status: "COMPLETADA",
                    tenantId: tenant.tenantId
                },
                _sum: { total: true },
                _count: true
            }),
            prisma.sale.aggregate({
                where: {
                    createdAt: {
                        gte: (() => {
                            const d = new Date(now);
                            d.setDate(now.getDate() - now.getDay());
                            d.setHours(0, 0, 0, 0);
                            return d;
                        })()
                    },
                    status: "COMPLETADA",
                    tenantId: tenant.tenantId
                },
                _sum: { total: true },
                _count: true
            }),
            prisma.sale.aggregate({
                where: {
                    createdAt: { gte: new Date(now.getFullYear(), now.getMonth(), 1) },
                    status: "COMPLETADA",
                    tenantId: tenant.tenantId
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
