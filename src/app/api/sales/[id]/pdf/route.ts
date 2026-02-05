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
                        email: true,
                        logo: true
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
        // Obtener logo como base64 data URI para @react-pdf
        let logoDataUri: string | undefined = undefined;
        const path = await import('path');
        const fs = await import('fs');

        // Usar logo B/N subido por el cliente para impresoras térmicas
        const logoRelativePath = '/uploads/logos/logo_print.jpeg';
        const logoAbsolutePath = path.join(process.cwd(), 'public', logoRelativePath);

        if (fs.existsSync(logoAbsolutePath)) {
            const logoBuffer = fs.readFileSync(logoAbsolutePath);
            const base64 = logoBuffer.toString('base64');
            const ext = path.extname(logoAbsolutePath).toLowerCase();
            const mimeType = ext === '.png' ? 'image/png' : 'image/jpeg';
            logoDataUri = `data:${mimeType};base64,${base64}`;
            console.log(`Logo cargado: ${logoAbsolutePath}, tamaño: ${logoBuffer.length} bytes`);
        } else {
            console.log(`Logo NO encontrado: ${logoAbsolutePath}`);
        }

        const COMPANY_INFO = {
            name: sale.tenant?.name || "CORPORACION OROPEZA'S",
            ruc: sale.tenant?.ruc || "10712870058",
            address: sale.tenant?.address || "CAL. MARIAN S/N - MARIAN-INDEP-HUARAZ",
            phone: sale.tenant?.phone || "938408777",
            email: sale.tenant?.email || "",
            logo: logoDataUri
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
        const docTypeNames: Record<string, string> = {
            "FACTURA": "Factura",
            "NOTA_VENTA": "NotaVenta",
            "BOLETA": "Boleta"
        };
        const docType = docTypeNames[sale.documentType] || "Boleta";
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
