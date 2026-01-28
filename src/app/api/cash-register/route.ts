import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getTenantFromSession } from "@/lib/tenant-context";

// GET /api/cash-register - Obtener caja activa
export async function GET() {
    try {
        // Obtener contexto de tenant
        const tenant = await getTenantFromSession();
        if (!tenant) {
            return NextResponse.json(
                { error: "No autenticado o tenant no válido" },
                { status: 401 }
            );
        }

        // Buscar caja abierta (sin cerrar) del tenant
        const activeCash = await prisma.cashRegister.findFirst({
            where: {
                closedAt: null,
                tenantId: tenant.tenantId
            },
            orderBy: { openedAt: "desc" }
        });

        if (!activeCash) {
            return NextResponse.json({
                isOpen: false,
                message: "No hay caja abierta"
            });
        }

        // Calcular ventas desde la apertura de caja (filtrado por tenant)
        const sales = await prisma.sale.findMany({
            where: {
                createdAt: { gte: activeCash.openedAt },
                status: "COMPLETADA",
                tenantId: tenant.tenantId
            },
            select: {
                total: true,
                paymentMethod: true
            }
        });

        // Agrupar por método de pago
        const salesByMethod: Record<string, number> = {};
        let totalSales = 0;

        for (const sale of sales) {
            salesByMethod[sale.paymentMethod] =
                (salesByMethod[sale.paymentMethod] || 0) + sale.total;
            totalSales += sale.total;
        }

        return NextResponse.json({
            isOpen: true,
            cashRegister: activeCash,
            summary: {
                openingAmount: activeCash.openingAmount,
                totalSales,
                salesByMethod,
                expectedAmount: activeCash.openingAmount + (salesByMethod["EFECTIVO"] || 0),
                salesCount: sales.length
            }
        });
    } catch (error) {
        console.error("Error fetching cash register:", error);
        return NextResponse.json(
            { error: "Error al obtener caja" },
            { status: 500 }
        );
    }
}

// POST /api/cash-register - Abrir caja
export async function POST(request: NextRequest) {
    try {
        // Obtener contexto de tenant
        const tenant = await getTenantFromSession();
        if (!tenant) {
            return NextResponse.json(
                { error: "No autenticado o tenant no válido" },
                { status: 401 }
            );
        }

        const body = await request.json();
        const { openingAmount, notes } = body;

        // Verificar que no haya caja abierta para este tenant
        const activeCash = await prisma.cashRegister.findFirst({
            where: {
                closedAt: null,
                tenantId: tenant.tenantId
            }
        });

        if (activeCash) {
            return NextResponse.json(
                { error: "Ya existe una caja abierta. Debe cerrarla primero." },
                { status: 400 }
            );
        }

        // Crear nueva caja
        const cashRegister = await prisma.cashRegister.create({
            data: {
                openingAmount: parseFloat(openingAmount) || 0,
                openedBy: "system",
                notes: notes || null,
                tenantId: tenant.tenantId
            }
        });

        return NextResponse.json({
            message: "Caja abierta correctamente",
            cashRegister
        }, { status: 201 });
    } catch (error) {
        console.error("Error opening cash register:", error);
        return NextResponse.json(
            { error: "Error al abrir caja" },
            { status: 500 }
        );
    }
}
