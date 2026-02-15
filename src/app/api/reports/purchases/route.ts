import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getTenantFromSession } from "@/lib/tenant-context";

// GET /api/reports/purchases - Reporte de compras con filtros y KPIs
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
        const paymentMethod = searchParams.get("paymentMethod");
        const supplierId = searchParams.get("supplierId");

        // Construir filtro
        const where: Record<string, unknown> = {
            tenantId: tenant.tenantId,
            status: "COMPLETADA",
        };

        const createdAtFilter: Record<string, Date> = {};
        if (dateFrom) {
            createdAtFilter.gte = new Date(dateFrom + "T00:00:00-05:00");
        }
        if (dateTo) {
            createdAtFilter.lte = new Date(dateTo + "T23:59:59.999-05:00");
        }
        if (Object.keys(createdAtFilter).length > 0) {
            where.createdAt = createdAtFilter;
        }

        if (paymentMethod) {
            where.paymentMethod = paymentMethod;
        }
        if (supplierId) {
            where.supplierId = supplierId;
        }

        // Obtener compras con detalles
        const purchases = await prisma.purchase.findMany({
            where,
            include: {
                supplier: {
                    select: { id: true, name: true, ruc: true },
                },
                items: {
                    select: {
                        id: true,
                        productName: true,
                        productCode: true,
                        quantity: true,
                        unitCost: true,
                        subtotal: true,
                    },
                },
                _count: {
                    select: { items: true },
                },
            },
            orderBy: { createdAt: "desc" },
        });

        // Calcular KPIs
        let totalCompras = 0;
        let subtotalTotal = 0;
        let igvTotal = 0;
        const comprasPorMetodo: Record<string, number> = {};
        const proveedoresSet = new Set<string>();
        let cantidadCompras = 0;

        for (const p of purchases) {
            totalCompras += p.total;
            subtotalTotal += p.subtotal;
            igvTotal += p.tax;
            cantidadCompras++;
            proveedoresSet.add(p.supplierId);

            const method = p.paymentMethod || "EFECTIVO";
            comprasPorMetodo[method] = (comprasPorMetodo[method] || 0) + p.total;
        }

        // Formatear respuesta
        const formattedPurchases = purchases.map((p) => ({
            id: p.id,
            number: p.number,
            invoiceNumber: p.invoiceNumber,
            invoiceDate: p.invoiceDate,
            subtotal: p.subtotal,
            tax: p.tax,
            total: p.total,
            paymentMethod: p.paymentMethod || "EFECTIVO",
            status: p.status,
            notes: p.notes,
            createdAt: p.createdAt,
            supplier: p.supplier,
            items: p.items,
            itemCount: p._count.items,
        }));

        return NextResponse.json({
            purchases: formattedPurchases,
            kpis: {
                totalCompras,
                subtotalTotal,
                igvTotal,
                cantidadCompras,
                proveedoresUnicos: proveedoresSet.size,
                comprasPorMetodo,
                comprasEfectivo: comprasPorMetodo["EFECTIVO"] || 0,
                comprasOtros: totalCompras - (comprasPorMetodo["EFECTIVO"] || 0),
            },
        });
    } catch (error) {
        console.error("Error fetching purchases report:", error);
        return NextResponse.json(
            { error: "Error al generar reporte de compras" },
            { status: 500 }
        );
    }
}
