import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getTenantFromSession } from "@/lib/tenant-context";

// GET /api/quotations/[id] - Obtener detalle de cotización
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

        const quotation = await prisma.quotation.findFirst({
            where: {
                id,
                tenantId: tenant.tenantId
            },
            include: {
                client: true,
                user: { select: { id: true, name: true } },
                items: {
                    include: {
                        product: {
                            select: {
                                id: true,
                                code: true,
                                name: true,
                                price: true
                            }
                        }
                    }
                }
            }
        });

        if (!quotation) {
            return NextResponse.json(
                { error: "Cotización no encontrada" },
                { status: 404 }
            );
        }

        return NextResponse.json(quotation);
    } catch (error) {
        console.error("Error fetching quotation:", error);
        return NextResponse.json(
            { error: "Error al obtener cotización" },
            { status: 500 }
        );
    }
}

// PATCH /api/quotations/[id] - Actualizar estado de cotización
export async function PATCH(
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
        const body = await request.json();
        const { status } = body;

        const validStatuses = ["PENDIENTE", "ACEPTADA", "RECHAZADA", "VENCIDA", "CONVERTIDA"];
        if (status && !validStatuses.includes(status)) {
            return NextResponse.json(
                { error: "Estado no válido" },
                { status: 400 }
            );
        }

        const quotation = await prisma.quotation.update({
            where: { id },
            data: { status },
            include: {
                client: true,
                user: { select: { name: true } },
                items: true
            }
        });

        return NextResponse.json(quotation);
    } catch (error) {
        console.error("Error updating quotation:", error);
        return NextResponse.json(
            { error: "Error al actualizar cotización" },
            { status: 500 }
        );
    }
}

// DELETE /api/quotations/[id] - Eliminar cotización
export async function DELETE(
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

        // Verificar que existe y pertenece al tenant
        const quotation = await prisma.quotation.findFirst({
            where: { id, tenantId: tenant.tenantId }
        });

        if (!quotation) {
            return NextResponse.json(
                { error: "Cotización no encontrada" },
                { status: 404 }
            );
        }

        // Eliminar en transacción (items + cotización)
        await prisma.$transaction(async (tx) => {
            await tx.quotationItem.deleteMany({ where: { quotationId: id } });
            await tx.quotation.delete({ where: { id } });
        });

        return NextResponse.json({ message: "Cotización eliminada correctamente" });
    } catch (error) {
        console.error("Error deleting quotation:", error);
        return NextResponse.json(
            { error: "Error al eliminar cotización" },
            { status: 500 }
        );
    }
}
