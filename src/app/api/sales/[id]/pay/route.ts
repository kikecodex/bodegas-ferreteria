import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getTenantFromSession } from "@/lib/tenant-context";

// POST /api/sales/[id]/pay - Marcar venta a crédito como pagada
export async function POST(
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

        // Verificar que la venta existe y es del tenant
        const sale = await prisma.sale.findFirst({
            where: {
                id,
                tenantId: tenant.tenantId
            }
        });

        if (!sale) {
            return NextResponse.json(
                { error: "Venta no encontrada" },
                { status: 404 }
            );
        }

        // Verificar que es una venta a crédito
        if (sale.paymentMethod !== "CREDITO") {
            return NextResponse.json(
                { error: "Esta venta no es a crédito" },
                { status: 400 }
            );
        }

        // Marcar como pagada
        const updatedSale = await prisma.sale.update({
            where: { id },
            data: {
                status: "PAGADO",
                notes: sale.notes
                    ? `${sale.notes}\n[PAGO REGISTRADO: ${new Date().toLocaleString('es-PE')}]`
                    : `[PAGO REGISTRADO: ${new Date().toLocaleString('es-PE')}]`
            }
        });

        return NextResponse.json({
            success: true,
            sale: updatedSale
        });
    } catch (error) {
        console.error("Error marking sale as paid:", error);
        return NextResponse.json(
            { error: "Error al registrar pago" },
            { status: 500 }
        );
    }
}
