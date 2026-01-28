import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

interface RouteParams {
    params: Promise<{ id: string }>;
}

// PUT /api/alerts/reorder/[id] - Actualiza estado de una alerta
export async function PUT(request: NextRequest, { params }: RouteParams) {
    try {
        const { id } = await params;
        const body = await request.json();
        const { status, notes, acknowledgedBy } = body;

        const existing = await prisma.reorderAlert.findUnique({ where: { id } });
        if (!existing) {
            return NextResponse.json(
                { error: "Alerta no encontrada" },
                { status: 404 }
            );
        }

        // Preparar datos de actualización según el estado
        const updateData: Record<string, unknown> = {};

        if (status) {
            updateData.status = status;

            switch (status) {
                case "ACKNOWLEDGED":
                    updateData.acknowledgedAt = new Date();
                    if (acknowledgedBy) updateData.acknowledgedBy = acknowledgedBy;
                    break;
                case "ORDERED":
                    updateData.orderedAt = new Date();
                    // Actualizar última fecha de pedido en el producto
                    await prisma.product.update({
                        where: { id: existing.productId },
                        data: { lastOrderDate: new Date() }
                    });
                    break;
                case "RESOLVED":
                    updateData.resolvedAt = new Date();
                    break;
            }
        }

        if (notes !== undefined) {
            updateData.notes = notes;
        }

        const alert = await prisma.reorderAlert.update({
            where: { id },
            data: updateData,
            include: {
                product: {
                    select: { code: true, name: true }
                }
            }
        });

        return NextResponse.json(alert);
    } catch (error) {
        console.error("Error updating reorder alert:", error);
        return NextResponse.json(
            { error: "Error al actualizar alerta" },
            { status: 500 }
        );
    }
}

// DELETE /api/alerts/reorder/[id] - Elimina una alerta
export async function DELETE(request: NextRequest, { params }: RouteParams) {
    try {
        const { id } = await params;

        const existing = await prisma.reorderAlert.findUnique({ where: { id } });
        if (!existing) {
            return NextResponse.json(
                { error: "Alerta no encontrada" },
                { status: 404 }
            );
        }

        await prisma.reorderAlert.delete({ where: { id } });

        return NextResponse.json({ message: "Alerta eliminada correctamente" });
    } catch (error) {
        console.error("Error deleting reorder alert:", error);
        return NextResponse.json(
            { error: "Error al eliminar alerta" },
            { status: 500 }
        );
    }
}
