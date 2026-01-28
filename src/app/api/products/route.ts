import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getTenantFromSession } from "@/lib/tenant-context";

// GET /api/products - Lista productos con paginación y filtros
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

        // Parámetros de paginación
        const page = parseInt(searchParams.get("page") || "1");
        const limit = parseInt(searchParams.get("limit") || "20");
        const skip = (page - 1) * limit;

        // Filtros
        const search = searchParams.get("search") || "";
        const categoryId = searchParams.get("categoryId");
        const stockStatus = searchParams.get("stockStatus"); // "low", "out", "ok"
        const isActive = searchParams.get("isActive") !== "false";

        // Construir where clause con tenantId
        const where: Record<string, unknown> = {
            isActive,
            tenantId: tenant.tenantId
        };

        if (search) {
            where.OR = [
                { name: { contains: search } },
                { code: { contains: search } },
                { description: { contains: search } }
            ];
        }

        if (categoryId) {
            where.categoryId = categoryId;
        }

        // Filtro de stock - Para "low" necesitamos filtrar después porque Prisma no soporta comparar campos
        if (stockStatus === "out") {
            where.stock = 0;
        }
        // Nota: stockStatus "low" se filtra después de obtener los resultados

        // Obtener productos
        const [products, total] = await Promise.all([
            prisma.product.findMany({
                where,
                include: {
                    category: {
                        select: { id: true, name: true, color: true }
                    },
                    unitsOfMeasure: {
                        where: { isActive: true },
                        orderBy: { conversionFactor: "asc" }
                    },
                    _count: {
                        select: { reorderAlerts: true }
                    }
                },
                orderBy: { name: "asc" },
                skip,
                take: limit
            }),
            prisma.product.count({ where })
        ]);

        return NextResponse.json({
            products,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit)
            }
        });
    } catch (error) {
        console.error("Error fetching products:", error);
        return NextResponse.json(
            { error: "Error al obtener productos" },
            { status: 500 }
        );
    }
}

// POST /api/products - Crea un nuevo producto
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
            code,
            name,
            description,
            price,
            cost,
            stock,
            minStock,
            maxStock,
            unit,
            categoryId,
            reorderPoint,
            preferredVendor,
            image,
            unitsOfMeasure // Array de unidades adicionales
        } = body;

        // Validaciones
        if (!code || !name || !categoryId) {
            return NextResponse.json(
                { error: "Código, nombre y categoría son requeridos" },
                { status: 400 }
            );
        }

        if (price === undefined || cost === undefined) {
            return NextResponse.json(
                { error: "Precio y costo son requeridos" },
                { status: 400 }
            );
        }

        // Verificar código único en este tenant
        const existing = await prisma.product.findFirst({
            where: {
                code: code.trim(),
                tenantId: tenant.tenantId
            }
        });

        if (existing) {
            return NextResponse.json(
                { error: "Ya existe un producto con ese código" },
                { status: 409 }
            );
        }

        // Verificar categoría existe y pertenece al tenant
        const category = await prisma.category.findFirst({
            where: {
                id: categoryId,
                tenantId: tenant.tenantId
            }
        });

        if (!category) {
            return NextResponse.json(
                { error: "Categoría no encontrada" },
                { status: 404 }
            );
        }

        // Crear producto con unidades de medida
        const product = await prisma.product.create({
            data: {
                code: code.trim(),
                name: name.trim(),
                description: description?.trim() || null,
                price: parseFloat(price),
                cost: parseFloat(cost),
                stock: parseInt(stock) || 0,
                minStock: parseInt(minStock) || 5,
                maxStock: maxStock ? parseInt(maxStock) : null,
                unit: unit || "UND",
                categoryId,
                reorderPoint: reorderPoint ? parseInt(reorderPoint) : null,
                preferredVendor: preferredVendor?.trim() || null,
                image: image || null,
                tenantId: tenant.tenantId,
                // Crear unidad de medida por defecto (unidad base)
                unitsOfMeasure: {
                    create: [
                        {
                            name: "Unidad",
                            abbreviation: unit || "UND",
                            conversionFactor: 1,
                            price: parseFloat(price),
                            isDefault: true
                        },
                        // Unidades adicionales
                        ...(unitsOfMeasure || []).map((u: {
                            name: string;
                            abbreviation: string;
                            conversionFactor: number;
                            price: number;
                            barcode?: string;
                        }) => ({
                            name: u.name,
                            abbreviation: u.abbreviation,
                            conversionFactor: parseFloat(String(u.conversionFactor)),
                            price: parseFloat(String(u.price)),
                            barcode: u.barcode || null,
                            isDefault: false
                        }))
                    ]
                }
            },
            include: {
                category: true,
                unitsOfMeasure: true
            }
        });

        return NextResponse.json(product, { status: 201 });
    } catch (error) {
        console.error("Error creating product:", error);
        return NextResponse.json(
            { error: "Error al crear producto" },
            { status: 500 }
        );
    }
}
