import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getTenantFromSession, getUserFromSession } from "@/lib/tenant-context";

// GET /api/quotations - Listar cotizaciones
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

        const [quotations, total] = await Promise.all([
            prisma.quotation.findMany({
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
            prisma.quotation.count({ where })
        ]);

        return NextResponse.json({
            quotations,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit)
            }
        });
    } catch (error) {
        console.error("Error fetching quotations:", error);
        return NextResponse.json(
            { error: "Error al obtener cotizaciones" },
            { status: 500 }
        );
    }
}

// POST /api/quotations - Crear cotización
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
        const { clientId, items, validDays = 15, notes, discount = 0 } = body;

        if (!items || items.length === 0) {
            return NextResponse.json(
                { error: "Debe incluir al menos un producto" },
                { status: 400 }
            );
        }

        // Generar número de cotización
        const year = new Date().getFullYear();
        const lastQuotation = await prisma.quotation.findFirst({
            where: {
                tenantId: tenant.tenantId,
                number: { startsWith: `COT-${year}-` }
            },
            orderBy: { number: "desc" }
        });

        let nextNumber = 1;
        if (lastQuotation) {
            const lastNum = parseInt(lastQuotation.number.split("-")[2]);
            nextNumber = lastNum + 1;
        }
        const number = `COT-${year}-${String(nextNumber).padStart(4, "0")}`;

        // Calcular validez
        const validUntil = new Date();
        validUntil.setDate(validUntil.getDate() + validDays);

        // Calcular totales
        let subtotal = 0;
        const quotationItems = [];

        for (const item of items) {
            const product = await prisma.product.findUnique({
                where: { id: item.productId }
            });

            if (!product) continue;

            const itemSubtotal = item.quantity * (item.unitPrice || product.price);
            subtotal += itemSubtotal;

            quotationItems.push({
                productId: product.id,
                productName: product.name,
                productCode: product.code,
                quantity: item.quantity,
                unitPrice: item.unitPrice || product.price,
                discount: item.discount || 0,
                subtotal: itemSubtotal
            });
        }

        const tax = Math.round(subtotal * 0.18 * 100) / 100;
        const total = Math.round((subtotal - discount + tax) * 100) / 100;

        const quotation = await prisma.quotation.create({
            data: {
                number,
                clientId: clientId || null,
                userId: user.id,
                subtotal,
                discount,
                tax,
                total,
                validUntil,
                notes,
                tenantId: tenant.tenantId,
                items: {
                    create: quotationItems
                }
            },
            include: {
                client: true,
                user: { select: { name: true } },
                items: true
            }
        });

        return NextResponse.json(quotation, { status: 201 });
    } catch (error) {
        console.error("Error creating quotation:", error);
        return NextResponse.json(
            { error: "Error al crear cotización" },
            { status: 500 }
        );
    }
}
