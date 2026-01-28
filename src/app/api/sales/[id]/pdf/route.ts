import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { renderToBuffer } from "@react-pdf/renderer";
import { InvoicePDF } from "@/lib/pdf/InvoicePDF";
import { getTenantFromSession } from "@/lib/tenant-context";

// GET /api/sales/[id]/pdf - Generar PDF del comprobante
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        // Obtener contexto de tenant
        const tenant = await getTenantFromSession();
        if (!tenant) {
            return NextResponse.json(
                { error: "No autenticado o tenant no válido" },
                { status: 401 }
            );
        }

        const { id } = await params;

        // Obtener venta con items y cliente (verificando tenant)
        const sale = await prisma.sale.findFirst({
            where: {
                id,
                tenantId: tenant.tenantId
            },
            include: {
                items: {
                    include: {
                        product: {
                            select: {
                                code: true,
                                name: true
                            }
                        }
                    }
                },
                client: {
                    select: {
                        documentType: true,
                        document: true,
                        name: true,
                        address: true
                    }
                },
                tenant: {
                    select: {
                        name: true,
                        ruc: true,
                        address: true,
                        phone: true,
                        email: true
                    }
                }
            }
        });

        if (!sale) {
            return NextResponse.json(
                { error: "Venta no encontrada" },
                { status: 404 }
            );
        }

        // Información de la empresa desde el tenant
        const COMPANY_INFO = {
            name: sale.tenant?.name || tenant.tenantName,
            ruc: sale.tenant?.ruc || "20XXXXXXXXX",
            address: sale.tenant?.address || "Sin dirección",
            phone: sale.tenant?.phone || "",
            email: sale.tenant?.email || ""
        };

        // Preparar datos para el PDF
        const saleData = {
            number: sale.number,
            documentType: sale.documentType,
            documentNumber: sale.documentNumber || sale.number,
            createdAt: sale.createdAt.toISOString(),
            subtotal: sale.subtotal,
            discount: sale.discount,
            tax: sale.tax,
            total: sale.total,
            paymentMethod: sale.paymentMethod,
            items: sale.items.map(item => ({
                productCode: item.productCode,
                productName: item.productName,
                quantity: item.quantity,
                unitPrice: item.unitPrice,
                discount: item.discount,
                subtotal: item.subtotal
            })),
            client: sale.client ? {
                documentType: sale.client.documentType,
                document: sale.client.document,
                name: sale.client.name,
                address: sale.client.address || undefined
            } : undefined
        };

        // Generar PDF
        const pdfBuffer = await renderToBuffer(
            InvoicePDF({ sale: saleData, company: COMPANY_INFO })
        );

        // Nombre del archivo
        const docType = sale.documentType === "FACTURA" ? "Factura" : "Boleta";
        const fileName = `${docType}_${sale.number}.pdf`;

        // Retornar PDF (convertir Buffer a Uint8Array)
        return new NextResponse(new Uint8Array(pdfBuffer), {
            status: 200,
            headers: {
                "Content-Type": "application/pdf",
                "Content-Disposition": `inline; filename="${fileName}"`,
                "Cache-Control": "no-cache"
            }
        });
    } catch (error) {
        console.error("Error generando PDF:", error);
        return NextResponse.json(
            { error: "Error al generar PDF" },
            { status: 500 }
        );
    }
}
