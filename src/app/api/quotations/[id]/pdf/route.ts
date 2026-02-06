import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getTenantFromSession } from "@/lib/tenant-context";
import { renderToStream } from "@react-pdf/renderer";
import { QuotationPDF } from "@/lib/pdf/QuotationPDF";

// GET /api/quotations/[id]/pdf - Generar PDF de cotización
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

        // Obtener cotización con items y tenant info
        const quotation = await prisma.quotation.findFirst({
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

        if (!quotation || !quotation.tenant) {
            return NextResponse.json(
                { error: "Cotización no encontrada" },
                { status: 404 }
            );
        }

        // Construir datos para el PDF
        const tenantData = quotation.tenant;

        // Usar logo actualizado del public folder
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
        const logoUrl = `${baseUrl}/logo.jpeg`;

        const company = {
            name: tenantData.tradeName || tenantData.name,
            ruc: tenantData.ruc || "",
            address: tenantData.address || "",
            phone: tenantData.phone || "",
            email: tenantData.email || "",
            logo: logoUrl
        };

        const quotationData = {
            number: quotation.number,
            createdAt: quotation.createdAt.toISOString(),
            validUntil: quotation.validUntil.toISOString(),
            subtotal: quotation.subtotal,
            discount: quotation.discount,
            tax: quotation.tax,
            total: quotation.total,
            notes: quotation.notes,
            items: quotation.items.map(item => ({
                productCode: item.productCode,
                productName: item.productName,
                quantity: item.quantity,
                unitPrice: item.unitPrice,
                discount: item.discount,
                subtotal: item.subtotal
            })),
            client: quotation.client ? {
                documentType: quotation.client.documentType || "DNI",
                document: quotation.client.document,
                name: quotation.client.name,
                address: quotation.client.address || ""
            } : undefined
        };

        // Generar PDF
        const pdfStream = await renderToStream(
            QuotationPDF({ quotation: quotationData, company })
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
                "Content-Disposition": `inline; filename="cotizacion-${quotation.number}.pdf"`
            }
        });
    } catch (error) {
        console.error("Error generating quotation PDF:", error);
        return NextResponse.json(
            { error: "Error al generar PDF" },
            { status: 500 }
        );
    }
}
