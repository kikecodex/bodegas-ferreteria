import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getTenantFromSession } from "@/lib/tenant-context";

// GET /api/sales/duplicates - Detectar ventas potencialmente duplicadas
export async function GET(request: NextRequest) {
    try {
        const tenant = await getTenantFromSession();
        if (!tenant) {
            return NextResponse.json(
                { error: "No autenticado" },
                { status: 401 }
            );
        }

        const { searchParams } = new URL(request.url);
        const threshold = parseInt(searchParams.get("threshold") || "60"); // segundos

        // Obtener todas las ventas del día de hoy (o últimos 7 días)
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

        const sales = await prisma.sale.findMany({
            where: {
                tenantId: tenant.tenantId,
                createdAt: { gte: sevenDaysAgo },
                status: "COMPLETADA"
            },
            include: {
                client: {
                    select: { name: true }
                },
                items: {
                    select: {
                        productId: true,
                        quantity: true,
                        unitPrice: true
                    }
                }
            },
            orderBy: { createdAt: "desc" }
        });

        // Agrupar por (total + clientId + items hash) para encontrar duplicados
        const groups: Map<string, typeof sales> = new Map();

        for (const sale of sales) {
            // Crear key basada en total, cliente y productos
            const itemsKey = sale.items
                .map(i => `${i.productId}:${i.quantity}:${i.unitPrice}`)
                .sort()
                .join("|");
            const key = `${sale.total.toFixed(2)}-${sale.clientId || "null"}-${itemsKey}`;

            if (!groups.has(key)) {
                groups.set(key, []);
            }
            groups.get(key)!.push(sale);
        }

        // Filtrar grupos con más de una venta y verificar proximidad de tiempo
        const duplicateGroups: Array<{
            key: string;
            total: number;
            client: string | null;
            sales: Array<{
                id: string;
                number: string;
                total: number;
                createdAt: Date;
                timeDiff: number | null;
            }>;
        }> = [];

        for (const [key, groupSales] of groups) {
            if (groupSales.length > 1) {
                // Ordenar por fecha
                groupSales.sort((a, b) =>
                    new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
                );

                // Verificar si hay ventas muy cercanas en tiempo
                const closeSales: typeof groupSales = [];
                for (let i = 0; i < groupSales.length; i++) {
                    if (i === 0) {
                        closeSales.push(groupSales[i]);
                        continue;
                    }
                    const timeDiff = (new Date(groupSales[i].createdAt).getTime() -
                        new Date(groupSales[i - 1].createdAt).getTime()) / 1000;
                    if (timeDiff <= threshold) {
                        if (!closeSales.includes(groupSales[i - 1])) {
                            closeSales.push(groupSales[i - 1]);
                        }
                        closeSales.push(groupSales[i]);
                    }
                }

                if (closeSales.length > 1) {
                    duplicateGroups.push({
                        key,
                        total: closeSales[0].total,
                        client: closeSales[0].client?.name || null,
                        sales: closeSales.map((s, idx) => ({
                            id: s.id,
                            number: s.number,
                            total: s.total,
                            createdAt: s.createdAt,
                            timeDiff: idx > 0
                                ? Math.round((new Date(s.createdAt).getTime() -
                                    new Date(closeSales[idx - 1].createdAt).getTime()) / 1000)
                                : null
                        }))
                    });
                }
            }
        }

        return NextResponse.json({
            duplicateGroups,
            totalDuplicates: duplicateGroups.reduce((sum, g) => sum + g.sales.length - 1, 0),
            thresholdSeconds: threshold
        });
    } catch (error) {
        console.error("Error detecting duplicates:", error);
        return NextResponse.json(
            { error: "Error al detectar duplicados" },
            { status: 500 }
        );
    }
}
