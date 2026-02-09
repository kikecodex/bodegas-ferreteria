import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getTenantFromSession } from "@/lib/tenant-context";

// POST /api/sales/[id]/pay - Registrar pago (total o parcial) de venta a crédito
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
        const body = await request.json().catch(() => ({}));
        const paymentAmount = body.amount ? parseFloat(body.amount) : null;
        const paymentMethod = body.method || "EFECTIVO";

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

        // Verificar que no esté ya pagada
        if (sale.status === "PAGADO") {
            return NextResponse.json(
                { error: "Esta venta ya fue pagada" },
                { status: 400 }
            );
        }

        // Calcular el saldo pendiente
        const currentPaid = sale.amountPaid || 0;
        const remaining = sale.total - currentPaid;

        // Si no se especifica monto, es pago total
        const amount = paymentAmount || remaining;

        if (amount <= 0) {
            return NextResponse.json(
                { error: "El monto debe ser mayor a 0" },
                { status: 400 }
            );
        }

        if (amount > remaining + 0.01) {
            return NextResponse.json(
                { error: `El monto excede el saldo pendiente de S/ ${remaining.toFixed(2)}` },
                { status: 400 }
            );
        }

        const newAmountPaid = currentPaid + amount;
        const newRemaining = sale.total - newAmountPaid;
        const isFullyPaid = newRemaining < 0.01;

        // Registrar el timestamp en hora Perú
        const now = new Date();
        const peruTime = now.toLocaleString('es-PE', { timeZone: 'America/Lima' });
        const paymentNote = `[ABONO S/ ${amount.toFixed(2)} - ${paymentMethod} - ${peruTime}]`;

        // Actualizar la venta
        const updatedSale = await prisma.sale.update({
            where: { id },
            data: {
                amountPaid: newAmountPaid,
                status: isFullyPaid ? "PAGADO" : "COMPLETADA",
                notes: sale.notes
                    ? `${sale.notes}\n${paymentNote}`
                    : paymentNote
            }
        });

        return NextResponse.json({
            success: true,
            sale: updatedSale,
            payment: {
                amount,
                method: paymentMethod,
                previousPaid: currentPaid,
                totalPaid: newAmountPaid,
                remaining: isFullyPaid ? 0 : newRemaining,
                isFullyPaid
            }
        });
    } catch (error) {
        console.error("Error registering payment:", error);
        return NextResponse.json(
            { error: "Error al registrar pago" },
            { status: 500 }
        );
    }
}
