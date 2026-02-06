import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getTenantFromSession } from "@/lib/tenant-context";
import { renderToStream } from "@react-pdf/renderer";
import { InvoicePDF } from "@/lib/pdf/InvoicePDF";

// GET /api/sales-notes/[id]/pdf - Generar PDF de nota de venta
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const tenant = await getTenantFromSession();
        if (!tenant) {
            return NextResponse.json(
                { error: "No autenticado" },
                { status: 401 }
            );
        }

        const { id } = await params;

        // Obtener nota de venta con items y tenant info
        const salesNote = await prisma.salesNote.findFirst({
            where: {
                id,
                tenantId: tenant.tenantId
            },
            include: {
                client: true,
                user: { select: { name: true } },
                items: true,
                tenant: {
                    select: {
                        name: true,
                        tradeName: true,
                        ruc: true,
                        address: true,
                        phone: true,
                        email: true,
                        logo: true
                    }
                }
            }
        });

        if (!salesNote || !salesNote.tenant) {
            return NextResponse.json(
                { error: "Nota de venta no encontrada" },
                { status: 404 }
            );
        }

        // Construir datos para el PDF (usar el mismo formato que InvoicePDF)
        const tenantData = salesNote.tenant;
        const company = {
            name: tenantData.tradeName || tenantData.name,
            ruc: tenantData.ruc || "",
            address: tenantData.address || "",
            phone: tenantData.phone || "",
            email: tenantData.email || "",
            logo: tenantData.logo || ""
        };

        const saleData = {
            number: salesNote.number,
            documentType: "NOTA_VENTA",
            createdAt: salesNote.createdAt.toISOString(),
            subtotal: salesNote.subtotal,
            discount: salesNote.discount,
            tax: salesNote.tax,
            total: salesNote.total,
            paymentMethod: salesNote.paymentMethod,
            items: salesNote.items.map(item => ({
                productCode: item.productCode,
                productName: item.productName,
                quantity: item.quantity,
                unitPrice: item.unitPrice,
                discount: item.discount,
                subtotal: item.subtotal
            })),
            client: salesNote.client ? {
                documentType: salesNote.client.documentType || "DNI",
                document: salesNote.client.document,
                name: salesNote.client.name,
                address: salesNote.client.address || ""
            } : undefined
        };

        // Generar PDF usando InvoicePDF
        const pdfStream = await renderToStream(
            InvoicePDF({ sale: saleData, company })
        );

        // Convertir stream a buffer
        const chunks: Buffer[] = [];
        for await (const chunk of pdfStream) {
            chunks.push(Buffer.from(chunk));
        }
        const pdfBuffer = Buffer.concat(chunks);

        return new NextResponse(pdfBuffer, {
            headers: {
                "Content-Type": "application/pdf",
                "Content-Disposition": `inline; filename="nota-venta-${salesNote.number}.pdf"`
            }
        });
    } catch (error) {
        console.error("Error generating sales note PDF:", error);
        return NextResponse.json(
            { error: "Error al generar PDF" },
            { status: 500 }
        );
    }
}
