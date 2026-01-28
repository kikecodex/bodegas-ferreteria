import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/kardex/[id] - Detalle de un movimiento específico
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;

        const movement = await prisma.stockMovement.findUnique({
            where: { id },
            include: {
                product: {
                    select: {
                        id: true,
                        code: true,
                        name: true,
                        unit: true,
                        stock: true,
                        category: {
                            select: { name: true }
                        }
                    }
                }
            }
        });

        if (!movement) {
            return NextResponse.json(
                { error: "Movimiento no encontrado" },
                { status: 404 }
            );
        }

        return NextResponse.json(movement);
    } catch (error) {
        console.error("Error fetching kardex movement:", error);
        return NextResponse.json(
            { error: "Error al obtener movimiento" },
            { status: 500 }
        );
    }
}
