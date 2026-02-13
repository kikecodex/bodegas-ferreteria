import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getTenantFromSession } from "@/lib/tenant-context";

// GET /api/reports/invoices - Reporte de facturas/boletas emitidas
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
        const documentType = searchParams.get("documentType"); // BOLETA, FACTURA, o null para ambos

        // Construir filtro de fecha con Peruvian Anchor Pattern
        const where: Record<string, unknown> = {
            tenantId: tenant.tenantId,
            status: "COMPLETADA",
        };

        if (documentType && (documentType === "BOLETA" || documentType === "FACTURA")) {
            where.documentType = documentType;
        } else {
            // Solo boletas y facturas (excluir NOTA_VENTA)
            where.documentType = { in: ["BOLETA", "FACTURA"] };
        }

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

        // Obtener comprobantes con detalle
        const sales = await prisma.sale.findMany({
            where,
            include: {
                client: {
                    select: {
                        id: true,
                        name: true,
                        document: true,
                        documentType: true,
                    },
                },
                items: {
                    select: {
                        id: true,
                        productName: true,
                        quantity: true,
                        unitPrice: true,
                        subtotal: true,
                    },
                },
            },
            orderBy: { createdAt: "desc" },
            take: 500,
        });

        // Calcular KPIs
        const boletas = sales.filter((s) => s.documentType === "BOLETA");
        const facturas = sales.filter((s) => s.documentType === "FACTURA");

        const totalBoletas = boletas.length;
        const totalFacturas = facturas.length;
        const montoBoletas = boletas.reduce((sum, s) => sum + s.total, 0);
        const montoFacturas = facturas.reduce((sum, s) => sum + s.total, 0);
        const montoTotal = montoBoletas + montoFacturas;

        // Desglose fiscal
        const subtotalTotal = sales.reduce((sum, s) => sum + s.subtotal, 0);
        const igvTotal = sales.reduce((sum, s) => sum + s.tax, 0);

        // Desglose por método de pago
        const porMetodoPago: Record<string, { count: number; amount: number }> = {};
        for (const sale of sales) {
            if (!porMetodoPago[sale.paymentMethod]) {
                porMetodoPago[sale.paymentMethod] = { count: 0, amount: 0 };
            }
            porMetodoPago[sale.paymentMethod].count++;
            porMetodoPago[sale.paymentMethod].amount += sale.total;
        }

        return NextResponse.json({
            sales: sales.map((s) => ({
                id: s.id,
                number: s.number,
                documentType: s.documentType,
                documentNumber: s.documentNumber,
                subtotal: s.subtotal,
                tax: s.tax,
                total: s.total,
                paymentMethod: s.paymentMethod,
                status: s.status,
                createdAt: s.createdAt,
                client: s.client,
                itemCount: s.items.length,
            })),
            kpis: {
                totalBoletas,
                totalFacturas,
                montoBoletas,
                montoFacturas,
                montoTotal,
                subtotalTotal,
                igvTotal,
                totalComprobantes: sales.length,
            },
            porMetodoPago,
        });
    } catch (error) {
        console.error("Error fetching invoices report:", error);
        return NextResponse.json(
            { error: "Error al generar reporte de facturas" },
            { status: 500 }
        );
    }
}
