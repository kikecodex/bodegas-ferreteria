import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getTenantFromSession } from "@/lib/tenant-context";
import { calculateTaxes } from "@/lib/tax-utils";

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
        const paymentMethod = searchParams.get("paymentMethod") || "";
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

        if (paymentMethod) {
            where.paymentMethod = paymentMethod;
        }

        if (dateFrom || dateTo) {
            where.createdAt = {};
            if (dateFrom) {
                // Forzar inicio del día en hora local de Perú (UTC-5)
                (where.createdAt as Record<string, unknown>).gte = new Date(dateFrom + 'T00:00:00-05:00');
            }
            if (dateTo) {
                // Forzar fin del día en hora local de Perú (UTC-5)
                (where.createdAt as Record<string, unknown>).lte = new Date(dateTo + 'T23:59:59.999-05:00');
            }
        }

        if (search) {
            where.OR = [
                { number: { contains: search } },
                { client: { name: { contains: search } } },
                { client: { document: { contains: search } } }
            ];
        }

        // Construir filtro para resumen (excluir CREDITO, solo COMPLETADA)
        const summaryWhere = {
            ...where,
            status: "COMPLETADA",
            paymentMethod: { not: "CREDITO" }
        };

        // Consultar ventas paginadas + total + resumen agregado
        const [sales, total, summaryAgg, summaryCount] = await Promise.all([
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
            prisma.sale.count({ where }),
            prisma.sale.aggregate({
                where: summaryWhere,
                _sum: { total: true }
            }),
            prisma.sale.count({ where: summaryWhere })
        ]);

        return NextResponse.json({
            sales,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit)
            },
            summary: {
                totalVentas: summaryAgg._sum.total || 0,
                cantidadVentas: summaryCount
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

        // Obtener productos para calcular totales (metadata - no requiere transacción)
        const productIds = items.map((item: { productId: string }) => item.productId);
        const products = await prisma.product.findMany({
            where: {
                id: { in: productIds },
                tenantId: tenant.tenantId
            }
        });

        const productMap = new Map(products.map(p => [p.id, p]));

        // Validar que todos los productos existen
        for (const item of items) {
            const product = productMap.get(item.productId);
            if (!product) {
                return NextResponse.json(
                    { error: `Producto ${item.productId} no encontrado` },
                    { status: 400 }
                );
            }
        }

        // Calcular totales (usa metadata de productos, no requiere transacción)
        let subtotal = 0;
        let totalDiscount = 0;
        let taxableAmount = 0;
        let exemptAmount = 0;

        const saleItems = items.map((item: { productId: string; quantity: number; unitPrice: number; discount?: number }) => {
            const product = productMap.get(item.productId)!;
            const itemSubtotal = item.quantity * item.unitPrice;
            const itemDiscount = item.discount || 0;
            const itemNet = itemSubtotal - itemDiscount;

            subtotal += itemSubtotal;
            totalDiscount += itemDiscount;

            // Separar montos gravados y exonerados
            if (product.igvExento) {
                exemptAmount += itemNet;
            } else {
                taxableAmount += itemNet;
            }

            return {
                productId: item.productId,
                productName: product.name,
                productCode: product.code,
                quantity: item.quantity,
                unitPrice: item.unitPrice,
                discount: itemDiscount,
                subtotal: itemNet
            };
        });

        // Calcular IGV - Solo productos gravados (precios ya incluyen IGV)
        const taxCalc = calculateTaxes(taxableAmount, true);
        const tax = taxCalc.tax;
        const total = taxCalc.total + exemptAmount;  // Gravados + exonerados

        // Calcular vuelto - Créditos no reciben pago al momento de la venta
        const effectivePaymentMethod = paymentMethod || "EFECTIVO";
        const paid = effectivePaymentMethod === "CREDITO" ? 0 : (amountPaid || total);
        const change = effectivePaymentMethod === "CREDITO" ? 0 : Math.max(0, paid - total);

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

        // TRANSACCIÓN ATÓMICA: número de venta + validación de stock + creación + descuento de stock
        const sale = await prisma.$transaction(async (tx) => {
            // 1. Generar número de venta DENTRO de la transacción (evita duplicados por race condition)
            const lastSale = await tx.sale.findFirst({
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

            // 2. Validar stock DENTRO de la transacción (evita stock negativo por race condition)
            for (const item of items) {
                const currentProduct = await tx.product.findUnique({
                    where: { id: item.productId },
                    select: { stock: true, name: true }
                });
                if (!currentProduct) {
                    throw new Error(`Producto ${item.productId} no encontrado`);
                }
                if (currentProduct.stock < item.quantity) {
                    throw new Error(`Stock insuficiente para ${currentProduct.name}. Disponible: ${currentProduct.stock}`);
                }
            }

            // 3. Crear la venta
            const newSale = await tx.sale.create({
                data: {
                    number: saleNumber,
                    clientId: clientId || null,
                    userId: defaultUser.id,
                    subtotal: taxCalc.subtotal + exemptAmount,  // Base imponible (sin IGV)
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

            // 4. Descontar stock y registrar movimientos
            for (const item of items) {
                const currentProduct = await tx.product.findUnique({
                    where: { id: item.productId },
                    select: { stock: true }
                });
                const newStock = (currentProduct?.stock || 0) - item.quantity;

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
                        previousStock: currentProduct?.stock || 0,
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
