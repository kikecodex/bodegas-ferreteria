import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getTenantFromSession } from "@/lib/tenant-context";

// GET /api/reports/top-products - Productos más vendidos
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
        const limit = parseInt(searchParams.get("limit") || "10");
        const period = searchParams.get("period") || "month";

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
            default: {
                const [y, m] = peruDateStr.split('-');
                startDate = new Date(`${y}-${m}-01T00:00:00-05:00`);
            }
        }

        // Obtener items de ventas agrupados por producto (filtrado por tenant)
        const saleItems = await prisma.saleItem.groupBy({
            by: ["productId"],
            where: {
                sale: {
                    createdAt: { gte: startDate },
                    status: "COMPLETADA",
                    tenantId: tenant.tenantId
                }
            },
            _sum: {
                quantity: true,
                subtotal: true
            },
            orderBy: {
                _sum: {
                    subtotal: "desc"
                }
            },
            take: limit
        });

        // Obtener datos de productos (ya filtrados por tenant en el join anterior)
        const productIds = saleItems.map(i => i.productId);
        const products = await prisma.product.findMany({
            where: {
                id: { in: productIds },
                tenantId: tenant.tenantId
            },
            select: {
                id: true,
                code: true,
                name: true,
                price: true,
                stock: true,
                category: { select: { name: true } }
            }
        });
        const productMap = new Map(products.map(p => [p.id, p]));

        // Combinar datos
        const topProducts = saleItems.map((item, index) => {
            const product = productMap.get(item.productId);
            return {
                rank: index + 1,
                productId: item.productId,
                code: product?.code || "N/A",
                name: product?.name || "Producto eliminado",
                category: product?.category?.name || "Sin categoría",
                cantidadVendida: item._sum.quantity || 0,
                totalVentas: Math.round((item._sum.subtotal || 0) * 100) / 100,
                stockActual: product?.stock || 0
            };
        });

        return NextResponse.json({
            period,
            topProducts
        });
    } catch (error) {
        console.error("Error fetching top products:", error);
        return NextResponse.json({ error: "Error al obtener productos top" }, { status: 500 });
    }
}
