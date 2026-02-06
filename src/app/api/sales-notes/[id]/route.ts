import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getTenantFromSession } from "@/lib/tenant-context";

// GET /api/sales-notes/[id] - Obtener detalle de nota de venta
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

        const salesNote = await prisma.salesNote.findFirst({
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

        if (!salesNote) {
            return NextResponse.json(
                { error: "Nota de venta no encontrada" },
                { status: 404 }
            );
        }

        return NextResponse.json(salesNote);
    } catch (error) {
        console.error("Error fetching sales note:", error);
        return NextResponse.json(
            { error: "Error al obtener nota de venta" },
            { status: 500 }
        );
    }
}
