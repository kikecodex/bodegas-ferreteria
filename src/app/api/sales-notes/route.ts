"use server";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getTenantFromSession, getUserFromSession } from "@/lib/tenant-context";

// GET /api/sales-notes - Listar notas de venta
export async function GET(request: NextRequest) {
    try {
        const tenant = await getTenantFromSession();
        if (!tenant) {
            return NextResponse.json(
                { error: "No autenticado o tenant no válido" },
                { status: 401 }
            );
        }

        const { searchParams } = new URL(request.url);
        const search = searchParams.get("search") || "";
        const status = searchParams.get("status") || "";
        const page = parseInt(searchParams.get("page") || "1");
        const limit = parseInt(searchParams.get("limit") || "20");
        const skip = (page - 1) * limit;

        const where: Record<string, unknown> = {
            tenantId: tenant.tenantId
        };

        if (status) {
            where.status = status;
        }

        if (search) {
            where.OR = [
                { number: { contains: search } },
                { client: { name: { contains: search } } },
                { client: { document: { contains: search } } }
            ];
        }

        const [salesNotes, total] = await Promise.all([
            prisma.salesNote.findMany({
                where,
                include: {
                    client: { select: { id: true, name: true, document: true } },
                    user: { select: { id: true, name: true } },
                    _count: { select: { items: true } }
                },
                orderBy: { createdAt: "desc" },
                skip,
                take: limit
            }),
            prisma.salesNote.count({ where })
        ]);

        return NextResponse.json({
            salesNotes,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit)
            }
        });
    } catch (error) {
        console.error("Error fetching sales notes:", error);
        return NextResponse.json(
            { error: "Error al obtener notas de venta" },
            { status: 500 }
        );
    }
}

// POST /api/sales-notes - Crear nota de venta
export async function POST(request: NextRequest) {
    try {
        const tenant = await getTenantFromSession();
        const user = await getUserFromSession();

        if (!tenant || !user) {
            return NextResponse.json(
                { error: "No autenticado" },
                { status: 401 }
            );
        }

        const body = await request.json();
        const { clientId, items, paymentMethod = "EFECTIVO", amountPaid, notes, discount = 0 } = body;

        if (!items || items.length === 0) {
            return NextResponse.json(
                { error: "Debe incluir al menos un producto" },
                { status: 400 }
            );
        }

        // Generar número de nota de venta
        const year = new Date().getFullYear();
        const lastNote = await prisma.salesNote.findFirst({
            where: {
                tenantId: tenant.tenantId,
                number: { startsWith: `NV-${year}-` }
            },
            orderBy: { number: "desc" }
        });

        let nextNumber = 1;
        if (lastNote) {
            const lastNum = parseInt(lastNote.number.split("-")[2]);
            nextNumber = lastNum + 1;
        }
        const number = `NV-${year}-${String(nextNumber).padStart(4, "0")}`;

        // Calcular totales y actualizar stock
        let subtotal = 0;
        const salesNoteItems = [];

        for (const item of items) {
            const product = await prisma.product.findUnique({
                where: { id: item.productId }
            });

            if (!product) continue;

            const itemSubtotal = item.quantity * (item.unitPrice || product.price);
            subtotal += itemSubtotal;

            salesNoteItems.push({
                productId: product.id,
                productName: product.name,
                productCode: product.code,
                quantity: item.quantity,
                unitPrice: item.unitPrice || product.price,
                discount: item.discount || 0,
                subtotal: itemSubtotal
            });

            // Descontar stock
            await prisma.product.update({
                where: { id: product.id },
                data: {
                    stock: { decrement: item.quantity }
                }
            });

            // Registrar movimiento de stock
            await prisma.stockMovement.create({
                data: {
                    productId: product.id,
                    type: "VENTA",
                    quantity: -item.quantity,
                    previousStock: product.stock,
                    newStock: product.stock - item.quantity,
                    reason: "Nota de Venta",
                    reference: number,
                    tenantId: tenant.tenantId
                }
            });
        }

        const tax = Math.round(subtotal * 0.18 * 100) / 100;
        const total = Math.round((subtotal - discount + tax) * 100) / 100;
        const change = (amountPaid || total) - total;

        const salesNote = await prisma.salesNote.create({
            data: {
                number,
                clientId: clientId || null,
                userId: user.id,
                subtotal,
                discount,
                tax,
                total,
                paymentMethod,
                amountPaid: amountPaid || total,
                change: change > 0 ? change : 0,
                notes,
                tenantId: tenant.tenantId,
                items: {
                    create: salesNoteItems
                }
            },
            include: {
                client: true,
                user: { select: { name: true } },
                items: true
            }
        });

        return NextResponse.json(salesNote, { status: 201 });
    } catch (error) {
        console.error("Error creating sales note:", error);
        return NextResponse.json(
            { error: "Error al crear nota de venta" },
            { status: 500 }
        );
    }
}
