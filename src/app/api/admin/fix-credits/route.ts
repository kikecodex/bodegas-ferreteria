import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getTenantFromSession } from "@/lib/tenant-context";

// POST /api/admin/fix-credits - Corregir créditos que tienen amountPaid=total incorrectamente
export async function POST() {
    try {
        const tenant = await getTenantFromSession();
        if (!tenant) {
            return NextResponse.json({ error: "No autenticado" }, { status: 401 });
        }

        // Buscar ventas a crédito con status COMPLETADA (no pagadas aún)
        const creditSales = await prisma.sale.findMany({
            where: {
                tenantId: tenant.tenantId,
                paymentMethod: "CREDITO",
                status: "COMPLETADA"
            },
            select: {
                id: true,
                number: true,
                total: true,
                amountPaid: true,
                notes: true
            }
        });

        let fixed = 0;
        const results: Array<{ number: string; oldPaid: number; newPaid: number }> = [];

        for (const sale of creditSales) {
            // Calcular el monto real pagado desde el historial de abonos en las notas
            let realPaid = 0;
            if (sale.notes) {
                const regex = /\[ABONO S\/ ([\d.]+)/g;
                let match;
                while ((match = regex.exec(sale.notes)) !== null) {
                    realPaid += parseFloat(match[1]);
                }
            }

            // Si el amountPaid registrado no coincide con los abonos reales, corregir
            if (Math.abs((sale.amountPaid || 0) - realPaid) > 0.01) {
                await prisma.sale.update({
                    where: { id: sale.id },
                    data: {
                        amountPaid: realPaid,
                        // Si los abonos cubren el total, marcar como PAGADO
                        status: (sale.total - realPaid) < 0.01 ? "PAGADO" : "COMPLETADA"
                    }
                });
                results.push({
                    number: sale.number,
                    oldPaid: sale.amountPaid || 0,
                    newPaid: realPaid
                });
                fixed++;
            }
        }

        return NextResponse.json({
            message: `${fixed} créditos corregidos de ${creditSales.length} encontrados`,
            totalCredits: creditSales.length,
            fixed,
            details: results
        });
    } catch (error) {
        console.error("Error fixing credits:", error);
        return NextResponse.json(
            { error: "Error al corregir créditos" },
            { status: 500 }
        );
    }
}
