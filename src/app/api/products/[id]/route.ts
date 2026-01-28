import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getTenantFromSession } from "@/lib/tenant-context";

interface RouteParams {
    params: Promise<{ id: string }>;
}

// GET /api/products/[id] - Obtiene un producto por ID
export async function GET(request: NextRequest, { params }: RouteParams) {
    try {
        // Obtener contexto de tenant
        const tenant = await getTenantFromSession();
        if (!tenant) {
            return NextResponse.json(
                { error: "No autenticado o tenant no válido" },
                { status: 401 }
            );
        }

        const { id } = await params;

        const product = await prisma.product.findFirst({
            where: {
                id,
                tenantId: tenant.tenantId
            },
            include: {
                category: true,
                unitsOfMeasure: {
                    where: { isActive: true },
                    orderBy: { conversionFactor: "asc" }
                },
                reorderAlerts: {
                    where: { status: "PENDING" },
                    orderBy: { createdAt: "desc" },
                    take: 1
                }
            }
        });

        if (!product) {
            return NextResponse.json(
                { error: "Producto no encontrado" },
                { status: 404 }
            );
        }

        return NextResponse.json(product);
    } catch (error) {
        console.error("Error fetching product:", error);
        return NextResponse.json(
            { error: "Error al obtener producto" },
            { status: 500 }
        );
    }
}

// PUT /api/products/[id] - Actualiza un producto
export async function PUT(request: NextRequest, { params }: RouteParams) {
    try {
        // Obtener contexto de tenant
        const tenant = await getTenantFromSession();
        if (!tenant) {
            return NextResponse.json(
                { error: "No autenticado o tenant no válido" },
                { status: 401 }
            );
        }

        const { id } = await params;
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
            isActive,
            isFeatured
        } = body;

        // Verificar que existe y pertenece al tenant
        const existing = await prisma.product.findFirst({
            where: {
                id,
                tenantId: tenant.tenantId
            }
        });
        if (!existing) {
            return NextResponse.json(
                { error: "Producto no encontrado" },
                { status: 404 }
            );
        }

        // Verificar código único si se está cambiando
        if (code && code !== existing.code) {
            const duplicate = await prisma.product.findFirst({
                where: {
                    code: code.trim(),
                    tenantId: tenant.tenantId,
                    id: { not: id }
                }
            });
            if (duplicate) {
                return NextResponse.json(
                    { error: "Ya existe un producto con ese código" },
                    { status: 409 }
                );
            }
        }

        // Actualizar producto
        const product = await prisma.product.update({
            where: { id },
            data: {
                ...(code && { code: code.trim() }),
                ...(name && { name: name.trim() }),
                ...(description !== undefined && { description: description?.trim() || null }),
                ...(price !== undefined && { price: parseFloat(price) }),
                ...(cost !== undefined && { cost: parseFloat(cost) }),
                ...(stock !== undefined && { stock: parseInt(stock) }),
                ...(minStock !== undefined && { minStock: parseInt(minStock) }),
                ...(maxStock !== undefined && { maxStock: maxStock ? parseInt(maxStock) : null }),
                ...(unit && { unit }),
                ...(categoryId && { categoryId }),
                ...(reorderPoint !== undefined && { reorderPoint: reorderPoint ? parseInt(reorderPoint) : null }),
                ...(preferredVendor !== undefined && { preferredVendor: preferredVendor?.trim() || null }),
                ...(image !== undefined && { image }),
                ...(isActive !== undefined && { isActive }),
                ...(isFeatured !== undefined && { isFeatured })
            },
            include: {
                category: true,
                unitsOfMeasure: true
            }
        });

        // Verificar si necesita alerta de reorden
        if (stock !== undefined) {
            const newStock = parseInt(stock);
            const threshold = product.reorderPoint || product.minStock;

            if (newStock <= threshold) {
                // Verificar si ya hay una alerta pendiente
                const existingAlert = await prisma.reorderAlert.findFirst({
                    where: {
                        productId: id,
                        status: "PENDING"
                    }
                });

                if (!existingAlert) {
                    await prisma.reorderAlert.create({
                        data: {
                            productId: id,
                            type: newStock === 0 ? "OUT_OF_STOCK" : newStock <= product.minStock ? "LOW_STOCK" : "REORDER_POINT",
                            currentStock: newStock,
                            minStock: product.minStock,
                            reorderPoint: product.reorderPoint
                        }
                    });
                }
            }
        }

        return NextResponse.json(product);
    } catch (error) {
        console.error("Error updating product:", error);
        return NextResponse.json(
            { error: "Error al actualizar producto" },
            { status: 500 }
        );
    }
}

// DELETE /api/products/[id] - Soft delete de producto
export async function DELETE(request: NextRequest, { params }: RouteParams) {
    try {
        // Obtener contexto de tenant
        const tenant = await getTenantFromSession();
        if (!tenant) {
            return NextResponse.json(
                { error: "No autenticado o tenant no válido" },
                { status: 401 }
            );
        }

        const { id } = await params;

        const existing = await prisma.product.findFirst({
            where: {
                id,
                tenantId: tenant.tenantId
            }
        });
        if (!existing) {
            return NextResponse.json(
                { error: "Producto no encontrado" },
                { status: 404 }
            );
        }

        // Soft delete
        await prisma.product.update({
            where: { id },
            data: { isActive: false }
        });

        return NextResponse.json({ message: "Producto eliminado correctamente" });
    } catch (error) {
        console.error("Error deleting product:", error);
        return NextResponse.json(
            { error: "Error al eliminar producto" },
            { status: 500 }
        );
    }
}
