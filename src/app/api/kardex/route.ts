import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getTenantFromSession } from "@/lib/tenant-context";

// GET /api/kardex - Historial de movimientos por producto
export async function GET(request: NextRequest) {
    try {
        // Obtener contexto de tenant
        const tenant = await getTenantFromSession();
        if (!tenant) {
            return NextResponse.json(
                { error: "No autenticado o tenant no válido" },
                { status: 401 }
            );
        }

        const { searchParams } = new URL(request.url);
        const productId = searchParams.get("productId");

        // Parámetros de paginación
        const page = parseInt(searchParams.get("page") || "1");
        const limit = parseInt(searchParams.get("limit") || "20");
        const skip = (page - 1) * limit;

        // Filtros
        const type = searchParams.get("type") || ""; // ENTRADA, SALIDA, AJUSTE

        // Construir where con filtrado por productos del tenant
        const where: Record<string, unknown> = {
            product: {
                tenantId: tenant.tenantId
            }
        };

        if (productId) {
            where.productId = productId;
        }

        if (type) {
            where.type = type;
        }

        // Obtener movimientos
        const [movements, total] = await Promise.all([
            prisma.stockMovement.findMany({
                where,
                include: {
                    product: {
                        select: {
                            id: true,
                            code: true,
                            name: true,
                            unit: true
                        }
                    }
                },
                orderBy: { createdAt: "desc" },
                skip,
                take: limit
            }),
            prisma.stockMovement.count({ where })
        ]);

        return NextResponse.json({
            movements,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit)
            }
        });
    } catch (error) {
        console.error("Error fetching kardex:", error);
        return NextResponse.json(
            { error: "Error al obtener movimientos" },
            { status: 500 }
        );
    }
}

// POST /api/kardex - Registrar movimiento de stock
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
        const {
            productId,
            type,      // ENTRADA, SALIDA, AJUSTE
            quantity,  // Cantidad (siempre positivo, el tipo define si suma o resta)
            reason,
            reference
        } = body;

        // Validaciones
        if (!productId || !type || quantity === undefined) {
            return NextResponse.json(
                { error: "productId, type y quantity son requeridos" },
                { status: 400 }
            );
        }

        const validTypes = ["ENTRADA", "SALIDA", "AJUSTE", "TRANSFERENCIA"];
        if (!validTypes.includes(type)) {
            return NextResponse.json(
                { error: `Tipo inválido. Use: ${validTypes.join(", ")}` },
                { status: 400 }
            );
        }

        const qty = parseInt(quantity);
        if (isNaN(qty) || qty <= 0) {
            return NextResponse.json(
                { error: "Cantidad debe ser un número positivo" },
                { status: 400 }
            );
        }

        // Obtener producto actual (verificando tenant)
        const product = await prisma.product.findFirst({
            where: {
                id: productId,
                tenantId: tenant.tenantId
            }
        });

        if (!product) {
            return NextResponse.json(
                { error: "Producto no encontrado" },
                { status: 404 }
            );
        }

        // Calcular nuevo stock
        const previousStock = product.stock;
        let newStock: number;
        let movementQty: number;

        switch (type) {
            case "ENTRADA":
                newStock = previousStock + qty;
                movementQty = qty;
                break;
            case "SALIDA":
                if (previousStock < qty) {
                    return NextResponse.json(
                        { error: `Stock insuficiente. Disponible: ${previousStock}` },
                        { status: 400 }
                    );
                }
                newStock = previousStock - qty;
                movementQty = -qty;
                break;
            case "AJUSTE":
                // Para ajuste, quantity es el nuevo stock absoluto
                newStock = qty;
                movementQty = qty - previousStock;
                break;
            default:
                newStock = previousStock;
                movementQty = 0;
        }

        // Transacción: actualizar stock y crear movimiento
        const [movement] = await prisma.$transaction([
            prisma.stockMovement.create({
                data: {
                    productId,
                    type,
                    quantity: movementQty,
                    previousStock,
                    newStock,
                    reason: reason?.trim() || null,
                    reference: reference?.trim() || null
                },
                include: {
                    product: {
                        select: { code: true, name: true }
                    }
                }
            }),
            prisma.product.update({
                where: { id: productId },
                data: { stock: newStock }
            })
        ]);

        return NextResponse.json({
            movement,
            stockUpdate: {
                previousStock,
                newStock,
                difference: movementQty
            }
        }, { status: 201 });
    } catch (error) {
        console.error("Error creating kardex movement:", error);
        return NextResponse.json(
            { error: "Error al registrar movimiento" },
            { status: 500 }
        );
    }
}
