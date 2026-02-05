import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getTenantFromSession } from "@/lib/tenant-context";
import { renderToBuffer } from "@react-pdf/renderer";
import { InvoicePDF } from "@/lib/pdf/InvoicePDF";
import * as fs from "fs";
import * as path from "path";

// GET /api/sales/[id]/receipt - Genera el PDF del ticket de venta
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const tenantContext = await getTenantFromSession();

        if (!tenantContext?.tenantId) {
            return NextResponse.json(
                { error: "No autorizado" },
                { status: 401 }
            );
        }

        // Obtener la venta con todos los datos necesarios
        const sale = await prisma.sale.findFirst({
            where: {
                id,
                tenantId: tenantContext.tenantId
            },
            include: {
                items: {
                    include: {
                        product: true
                    }
                },
                client: true,
                user: true,
                tenant: true
            }
        });

        if (!sale) {
            return NextResponse.json(
                { error: "Venta no encontrada" },
                { status: 404 }
            );
        }

        // Preparar datos para el PDF
        const saleData = {
            number: sale.number,
            documentType: sale.documentType,
            documentNumber: sale.documentNumber || undefined,
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

        // Usar logo B/N optimizado para impresoras térmicas
        let logoBase64: string | undefined = undefined;
        const logoPrintPath = path.join(process.cwd(), "public", "uploads", "logos", "logo_print.jpeg");
        try {
            if (fs.existsSync(logoPrintPath)) {
                const logoBuffer = fs.readFileSync(logoPrintPath);
                logoBase64 = `data:image/jpeg;base64,${logoBuffer.toString("base64")}`;
            }
        } catch (logoError) {
            console.error("Error leyendo logo:", logoError);
        }

        const companyData = {
            name: sale.tenant?.name || "CORPORACIÓN OROPEZA'S",
            ruc: sale.tenant?.ruc || "10712870058",
            address: sale.tenant?.address || "Calle Marian s/n Independencia-Huaraz",
            phone: sale.tenant?.phone || "938408777",
            email: sale.tenant?.email || undefined,
            logo: logoBase64
        };

        // Generar PDF
        const pdfBuffer = await renderToBuffer(
            InvoicePDF({ sale: saleData, company: companyData })
        );

        // Retornar como PDF con headers para impresión directa
        return new NextResponse(new Uint8Array(pdfBuffer), {
            headers: {
                "Content-Type": "application/pdf",
                "Content-Disposition": `inline; filename="ticket-${sale.number}.pdf"`,
                // Headers adicionales para mejorar la experiencia
                "Cache-Control": "no-cache, no-store, must-revalidate",
                "Pragma": "no-cache"
            }
        });

    } catch (error) {
        console.error("Error al generar PDF:", error);
        return NextResponse.json(
            { error: "Error al generar PDF" },
            { status: 500 }
        );
    }
}
