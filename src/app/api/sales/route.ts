import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getTenantFromSession } from "@/lib/tenant-context";

// GET /api/sales - Listar ventas con filtros
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

        // Parámetros
        const page = parseInt(searchParams.get("page") || "1");
        const limit = parseInt(searchParams.get("limit") || "20");
        const skip = (page - 1) * limit;

        const status = searchParams.get("status") || "";
        const dateFrom = searchParams.get("dateFrom") || "";
        const dateTo = searchParams.get("dateTo") || "";
        const search = searchParams.get("search") || "";

        // Construir where con tenantId
        const where: Record<string, unknown> = {
            tenantId: tenant.tenantId
        };

        if (status) {
            where.status = status;
        }

        if (dateFrom || dateTo) {
            where.createdAt = {};
            if (dateFrom) {
                (where.createdAt as Record<string, unknown>).gte = new Date(dateFrom);
            }
            if (dateTo) {
                const endDate = new Date(dateTo);
                endDate.setHours(23, 59, 59, 999);
                (where.createdAt as Record<string, unknown>).lte = endDate;
            }
        }

        if (search) {
            where.OR = [
                { number: { contains: search } },
                { client: { name: { contains: search } } },
                { client: { document: { contains: search } } }
            ];
        }

        // Consultar
        const [sales, total] = await Promise.all([
            prisma.sale.findMany({
                where,
                include: {
                    client: {
                        select: {
                            id: true,
                            name: true,
                            document: true,
                            documentType: true
                        }
                    },
                    user: {
                        select: {
                            id: true,
                            name: true
                        }
                    },
                    _count: {
                        select: { items: true }
                    }
                },
                orderBy: { createdAt: "desc" },
                skip,
                take: limit
            }),
            prisma.sale.count({ where })
        ]);

        return NextResponse.json({
            sales,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit)
            }
        });
    } catch (error) {
        console.error("Error fetching sales:", error);
        return NextResponse.json(
            { error: "Error al obtener ventas" },
            { status: 500 }
        );
    }
}

// POST /api/sales - Crear nueva venta
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
            clientId,
            items,           // [{ productId, quantity, unitPrice, discount }]
            paymentMethod,
            amountPaid,
            documentType,    // BOLETA, FACTURA, NOTA_VENTA
            notes
        } = body;

        // Validaciones
        if (!items || items.length === 0) {
            return NextResponse.json(
                { error: "La venta debe tener al menos un item" },
                { status: 400 }
            );
        }

        // Obtener productos para validar stock (filtrado por tenant)
        const productIds = items.map((item: { productId: string }) => item.productId);
        const products = await prisma.product.findMany({
            where: {
                id: { in: productIds },
                tenantId: tenant.tenantId
            }
        });

        const productMap = new Map(products.map(p => [p.id, p]));

        // Validar stock disponible
        for (const item of items) {
            const product = productMap.get(item.productId);
            if (!product) {
                return NextResponse.json(
                    { error: `Producto ${item.productId} no encontrado` },
                    { status: 400 }
                );
            }
            if (product.stock < item.quantity) {
                return NextResponse.json(
                    { error: `Stock insuficiente para ${product.name}. Disponible: ${product.stock}` },
                    { status: 400 }
                );
            }
        }

        // Calcular totales
        let subtotal = 0;
        let totalDiscount = 0;
        const saleItems = items.map((item: { productId: string; quantity: number; unitPrice: number; discount?: number }) => {
            const product = productMap.get(item.productId)!;
            const itemSubtotal = item.quantity * item.unitPrice;
            const itemDiscount = item.discount || 0;
            subtotal += itemSubtotal;
            totalDiscount += itemDiscount;

            return {
                productId: item.productId,
                productName: product.name,
                productCode: product.code,
                quantity: item.quantity,
                unitPrice: item.unitPrice,
                discount: itemDiscount,
                subtotal: itemSubtotal - itemDiscount
            };
        });

        // Calcular IGV (18%)
        const taxableAmount = subtotal - totalDiscount;
        const tax = Math.round(taxableAmount * 0.18 * 100) / 100;
        const total = Math.round((taxableAmount + tax) * 100) / 100;

        // Calcular vuelto
        const paid = amountPaid || total;
        const change = Math.max(0, paid - total);

        // Generar número de venta (por tenant)
        const lastSale = await prisma.sale.findFirst({
            where: { tenantId: tenant.tenantId },
            orderBy: { createdAt: "desc" },
            select: { number: true }
        });

        const today = new Date();
        const prefix = `V${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, "0")}`;
        let sequence = 1;

        if (lastSale?.number?.startsWith(prefix)) {
            sequence = parseInt(lastSale.number.slice(-6)) + 1;
        }

        const saleNumber = `${prefix}${String(sequence).padStart(6, "0")}`;

        // Obtener usuario por defecto para POS (crear si no existe, asociado al tenant)
        let defaultUser = await prisma.user.findFirst({
            where: {
                email: `pos@${tenant.tenantSlug}.local`,
                tenantId: tenant.tenantId
            }
        });

        if (!defaultUser) {
            defaultUser = await prisma.user.create({
                data: {
                    email: `pos@${tenant.tenantSlug}.local`,
                    name: "Usuario POS",
                    password: "not-used",
                    role: "VENDEDOR",
                    tenantId: tenant.tenantId
                }
            });
        }

        // Crear venta con transacción
        const sale = await prisma.$transaction(async (tx) => {
            // 1. Crear la venta
            const newSale = await tx.sale.create({
                data: {
                    number: saleNumber,
                    clientId: clientId || null,
                    userId: defaultUser.id,
                    subtotal,
                    discount: totalDiscount,
                    tax,
                    total,
                    paymentMethod: paymentMethod || "EFECTIVO",
                    amountPaid: paid,
                    change,
                    status: "COMPLETADA",
                    documentType: documentType || "BOLETA",
                    notes: notes || null,
                    tenantId: tenant.tenantId,
                    items: {
                        create: saleItems
                    }
                },
                include: {
                    client: true,
                    items: true
                }
            });

            // 2. Descontar stock y registrar movimientos
            for (const item of items) {
                const product = productMap.get(item.productId)!;
                const newStock = product.stock - item.quantity;

                // Actualizar stock
                await tx.product.update({
                    where: { id: item.productId },
                    data: { stock: newStock }
                });

                // Registrar movimiento de stock
                await tx.stockMovement.create({
                    data: {
                        productId: item.productId,
                        type: "SALIDA",
                        quantity: -item.quantity,
                        previousStock: product.stock,
                        newStock,
                        reason: "Venta",
                        reference: saleNumber
                    }
                });
            }

            return newSale;
        });

        return NextResponse.json(sale, { status: 201 });
    } catch (error) {
        console.error("Error creating sale:", error);
        return NextResponse.json(
            { error: "Error al crear venta" },
            { status: 500 }
        );
    }
}
