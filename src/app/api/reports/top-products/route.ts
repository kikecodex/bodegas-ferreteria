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

        // Calcular fecha según período
        const now = new Date();
        let startDate: Date;

        switch (period) {
            case "day":
                startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
                break;
            case "week":
                startDate = new Date(now);
                startDate.setDate(now.getDate() - now.getDay());
                startDate.setHours(0, 0, 0, 0);
                break;
            case "month":
                startDate = new Date(now.getFullYear(), now.getMonth(), 1);
                break;
            case "year":
                startDate = new Date(now.getFullYear(), 0, 1);
                break;
            default:
                startDate = new Date(now.getFullYear(), now.getMonth(), 1);
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
