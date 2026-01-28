import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getTenantFromSession } from "@/lib/tenant-context";

// GET /api/purchases - Listar compras
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
        const page = parseInt(searchParams.get("page") || "1");
        const limit = parseInt(searchParams.get("limit") || "20");
        const skip = (page - 1) * limit;
        const supplierId = searchParams.get("supplierId") || "";

        const where: Record<string, unknown> = {
            tenantId: tenant.tenantId
        };

        if (supplierId) {
            where.supplierId = supplierId;
        }

        const [purchases, total] = await Promise.all([
            prisma.purchase.findMany({
                where,
                include: {
                    supplier: {
                        select: { id: true, name: true, ruc: true }
                    },
                    user: {
                        select: { id: true, name: true }
                    },
                    _count: {
                        select: { items: true }
                    }
                },
                orderBy: { createdAt: "desc" },
                skip,
                take: limit
            }),
            prisma.purchase.count({ where })
        ]);

        return NextResponse.json({
            purchases,
            pagination: { page, limit, total, totalPages: Math.ceil(total / limit) }
        });
    } catch (error) {
        console.error("Error fetching purchases:", error);
        return NextResponse.json({ error: "Error al obtener compras" }, { status: 500 });
    }
}

// POST /api/purchases - Registrar compra (entrada de mercadería)
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
        const { supplierId, invoiceNumber, invoiceDate, items, notes } = body;

        if (!supplierId || !items || items.length === 0) {
            return NextResponse.json(
                { error: "Proveedor e items son requeridos" },
                { status: 400 }
            );
        }

        // Verificar proveedor existe y pertenece al tenant
        const supplier = await prisma.supplier.findFirst({
            where: {
                id: supplierId,
                tenantId: tenant.tenantId
            }
        });
        if (!supplier) {
            return NextResponse.json({ error: "Proveedor no encontrado" }, { status: 400 });
        }

        // Obtener productos para validar (filtrado por tenant)
        const productIds = items.map((i: { productId: string }) => i.productId);
        const products = await prisma.product.findMany({
            where: {
                id: { in: productIds },
                tenantId: tenant.tenantId
            }
        });
        const productMap = new Map(products.map(p => [p.id, p]));

        // Calcular totales
        let subtotal = 0;
        const purchaseItems = items.map((item: { productId: string; quantity: number; unitCost: number }) => {
            const product = productMap.get(item.productId);
            if (!product) throw new Error(`Producto ${item.productId} no encontrado`);

            const itemSubtotal = item.quantity * item.unitCost;
            subtotal += itemSubtotal;

            return {
                productId: item.productId,
                productName: product.name,
                productCode: product.code,
                quantity: item.quantity,
                unitCost: item.unitCost,
                subtotal: itemSubtotal
            };
        });

        const tax = Math.round(subtotal * 0.18 * 100) / 100;
        const total = Math.round((subtotal + tax) * 100) / 100;

        // Generar número de compra (por tenant)
        const lastPurchase = await prisma.purchase.findFirst({
            where: { tenantId: tenant.tenantId },
            orderBy: { createdAt: "desc" },
            select: { number: true }
        });
        const today = new Date();
        const prefix = `C${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, "0")}`;
        let sequence = 1;
        if (lastPurchase?.number?.startsWith(prefix)) {
            sequence = parseInt(lastPurchase.number.slice(-6)) + 1;
        }
        const purchaseNumber = `${prefix}${String(sequence).padStart(6, "0")}`;

        // Obtener usuario del tenant
        const user = await prisma.user.findFirst({
            where: { tenantId: tenant.tenantId }
        });
        if (!user) {
            return NextResponse.json({ error: "No hay usuarios en el sistema" }, { status: 500 });
        }

        // Crear compra y actualizar stock en transacción
        const purchase = await prisma.$transaction(async (tx) => {
            // 1. Crear compra
            const newPurchase = await tx.purchase.create({
                data: {
                    number: purchaseNumber,
                    supplierId,
                    userId: user.id,
                    invoiceNumber: invoiceNumber || null,
                    invoiceDate: invoiceDate ? new Date(invoiceDate) : null,
                    subtotal,
                    tax,
                    total,
                    status: "COMPLETADA",
                    notes: notes || null,
                    tenantId: tenant.tenantId,
                    items: { create: purchaseItems }
                },
                include: { supplier: true, items: true }
            });

            // 2. Aumentar stock de cada producto
            for (const item of items) {
                const product = productMap.get(item.productId)!;
                const newStock = product.stock + item.quantity;

                await tx.product.update({
                    where: { id: item.productId },
                    data: {
                        stock: newStock,
                        cost: item.unitCost
                    }
                });

                // Registrar movimiento de stock
                await tx.stockMovement.create({
                    data: {
                        productId: item.productId,
                        type: "ENTRADA",
                        quantity: item.quantity,
                        previousStock: product.stock,
                        newStock,
                        reason: "Compra a proveedor",
                        reference: purchaseNumber
                    }
                });
            }

            return newPurchase;
        });

        return NextResponse.json(purchase, { status: 201 });
    } catch (error) {
        console.error("Error creating purchase:", error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : "Error al registrar compra" },
            { status: 500 }
        );
    }
}
