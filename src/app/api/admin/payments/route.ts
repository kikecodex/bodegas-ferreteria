import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isSuperAdmin } from "@/lib/tenant-context";

// GET /api/admin/payments - Listar pagos
export async function GET(request: NextRequest) {
    try {
        const isAdmin = await isSuperAdmin();
        if (!isAdmin) {
            return NextResponse.json(
                { error: "No autorizado" },
                { status: 403 }
            );
        }

        const { searchParams } = new URL(request.url);
        const tenantId = searchParams.get("tenantId");
        const page = parseInt(searchParams.get("page") || "1");
        const limit = parseInt(searchParams.get("limit") || "20");
        const skip = (page - 1) * limit;

        const where = tenantId ? { tenantId } : {};

        const [payments, total] = await Promise.all([
            prisma.payment.findMany({
                where,
                include: {
                    tenant: {
                        select: {
                            id: true,
                            name: true,
                            slug: true
                        }
                    }
                },
                orderBy: { createdAt: "desc" },
                skip,
                take: limit
            }),
            prisma.payment.count({ where })
        ]);

        return NextResponse.json({
            payments,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit)
            }
        });
    } catch (error) {
        console.error("Error fetching payments:", error);
        return NextResponse.json(
            { error: "Error al obtener pagos" },
            { status: 500 }
        );
    }
}

// POST /api/admin/payments - Registrar pago y extender suscripción
export async function POST(request: NextRequest) {
    try {
        const isAdmin = await isSuperAdmin();
        if (!isAdmin) {
            return NextResponse.json(
                { error: "No autorizado" },
                { status: 403 }
            );
        }

        const body = await request.json();
        const { tenantId, amount, method, reference, notes, months = 1 } = body;

        if (!tenantId || !amount) {
            return NextResponse.json(
                { error: "tenantId y amount son requeridos" },
                { status: 400 }
            );
        }

        // Verificar que el tenant existe
        const tenant = await prisma.tenant.findUnique({
            where: { id: tenantId }
        });

        if (!tenant) {
            return NextResponse.json(
                { error: "Tenant no encontrado" },
                { status: 404 }
            );
        }

        // Calcular nuevas fechas de suscripción
        const now = new Date();
        const currentExpiry = tenant.planExpiresAt || now;
        const startDate = currentExpiry > now ? currentExpiry : now;

        // Agregar meses a la fecha
        const endDate = new Date(startDate);
        endDate.setMonth(endDate.getMonth() + months);

        // Transacción: crear pago y actualizar tenant
        const [payment, updatedTenant] = await prisma.$transaction([
            prisma.payment.create({
                data: {
                    tenantId,
                    amount: parseFloat(amount),
                    method: method || "YAPE",
                    reference: reference || null,
                    notes: notes || null,
                    periodStart: startDate,
                    periodEnd: endDate
                }
            }),
            prisma.tenant.update({
                where: { id: tenantId },
                data: {
                    plan: "ACTIVO",
                    planExpiresAt: endDate,
                    isActive: true
                }
            })
        ]);

        return NextResponse.json({
            message: `Pago registrado. Suscripción extendida hasta ${endDate.toLocaleDateString("es-PE")}`,
            payment,
            tenant: {
                id: updatedTenant.id,
                name: updatedTenant.name,
                plan: updatedTenant.plan,
                planExpiresAt: updatedTenant.planExpiresAt
            }
        }, { status: 201 });
    } catch (error) {
        console.error("Error creating payment:", error);
        return NextResponse.json(
            { error: "Error al registrar pago" },
            { status: 500 }
        );
    }
}
