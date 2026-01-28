import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getTenantFromSession } from "@/lib/tenant-context";

// POST /api/alerts/check-stock - Verifica stock y crea alertas automáticas
// Esta función se puede llamar después de cada venta o como un cron job
export async function POST() {
    try {
        // Obtener tenant del usuario
        const tenantContext = await getTenantFromSession();
        if (!tenantContext) {
            return NextResponse.json(
                { error: "No autenticado" },
                { status: 401 }
            );
        }
        const { tenantId } = tenantContext;

        // Buscar productos con stock bajo o en punto de reorden
        const productsNeedingReorder = await prisma.product.findMany({
            where: {
                tenantId,
                isActive: true,
                OR: [
                    { stock: 0 }, // Sin stock
                    { stock: { lte: prisma.product.fields.minStock } }, // Por debajo del mínimo
                ]
            },
            select: {
                id: true,
                code: true,
                name: true,
                stock: true,
                minStock: true,
                reorderPoint: true,
                reorderAlerts: {
                    where: { status: "PENDING" },
                    select: { id: true }
                }
            }
        });

        // También buscar productos donde stock <= reorderPoint
        const productsAtReorderPoint = await prisma.$queryRaw<Array<{
            id: string;
            code: string;
            name: string;
            stock: number;
            minStock: number;
            reorderPoint: number | null;
        }>>`
      SELECT id, code, name, stock, "minStock", "reorderPoint" 
      FROM "Product" 
      WHERE "tenantId" = ${tenantId}
        AND "isActive" = true 
        AND "reorderPoint" IS NOT NULL 
        AND stock <= "reorderPoint" 
        AND stock > "minStock"
    `;

        const allProducts = [...productsNeedingReorder];

        // Agregar productos en punto de reorden que no estén ya en la lista
        for (const p of productsAtReorderPoint) {
            if (!allProducts.find(existing => existing.id === p.id)) {
                // Verificar si ya tiene alerta pendiente
                const hasAlert = await prisma.reorderAlert.findFirst({
                    where: { productId: p.id, status: "PENDING", tenantId }
                });

                allProducts.push({
                    ...p,
                    reorderAlerts: hasAlert ? [{ id: hasAlert.id }] : []
                });
            }
        }

        // Crear alertas para productos que no tienen una pendiente
        const alertsCreated: string[] = [];

        for (const product of allProducts) {
            // Si ya tiene alerta pendiente, skip
            if (product.reorderAlerts && product.reorderAlerts.length > 0) {
                continue;
            }

            // Determinar tipo de alerta
            let alertType = "REORDER_POINT";
            if (product.stock === 0) {
                alertType = "OUT_OF_STOCK";
            } else if (product.stock <= product.minStock) {
                alertType = "LOW_STOCK";
            }

            await prisma.reorderAlert.create({
                data: {
                    productId: product.id,
                    type: alertType,
                    currentStock: product.stock,
                    minStock: product.minStock,
                    reorderPoint: product.reorderPoint,
                    tenantId, // Multi-tenant
                }
            });

            alertsCreated.push(product.name);
        }

        return NextResponse.json({
            success: true,
            message: `Verificación completada`,
            productsChecked: allProducts.length,
            alertsCreated: alertsCreated.length,
            products: alertsCreated
        });
    } catch (error) {
        console.error("Error checking stock:", error);
        return NextResponse.json(
            { error: "Error al verificar stock" },
            { status: 500 }
        );
    }
}
