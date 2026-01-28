import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getTenantFromSession } from "@/lib/tenant-context";

interface RouteParams {
    params: Promise<{ id: string }>;
}

// GET /api/categories/[id] - Obtiene una categoría por ID
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

        const category = await prisma.category.findFirst({
            where: {
                id,
                tenantId: tenant.tenantId
            },
            include: {
                _count: {
                    select: { products: true }
                }
            }
        });

        if (!category) {
            return NextResponse.json(
                { error: "Categoría no encontrada" },
                { status: 404 }
            );
        }

        return NextResponse.json(category);
    } catch (error) {
        console.error("Error fetching category:", error);
        return NextResponse.json(
            { error: "Error al obtener categoría" },
            { status: 500 }
        );
    }
}

// PUT /api/categories/[id] - Actualiza una categoría
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
        const { name, description, color, icon, isActive } = body;

        // Verificar que existe y pertenece al tenant
        const existing = await prisma.category.findFirst({
            where: {
                id,
                tenantId: tenant.tenantId
            }
        });
        if (!existing) {
            return NextResponse.json(
                { error: "Categoría no encontrada" },
                { status: 404 }
            );
        }

        // Verificar nombre único si se está cambiando
        if (name && name !== existing.name) {
            const duplicate = await prisma.category.findFirst({
                where: {
                    name: name.trim(),
                    tenantId: tenant.tenantId,
                    id: { not: id }
                }
            });
            if (duplicate) {
                return NextResponse.json(
                    { error: "Ya existe una categoría con ese nombre" },
                    { status: 409 }
                );
            }
        }

        const category = await prisma.category.update({
            where: { id },
            data: {
                ...(name && { name: name.trim() }),
                ...(description !== undefined && { description: description?.trim() || null }),
                ...(color && { color }),
                ...(icon && { icon }),
                ...(isActive !== undefined && { isActive })
            }
        });

        return NextResponse.json(category);
    } catch (error) {
        console.error("Error updating category:", error);
        return NextResponse.json(
            { error: "Error al actualizar categoría" },
            { status: 500 }
        );
    }
}

// DELETE /api/categories/[id] - Soft delete de categoría
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

        // Verificar que existe y pertenece al tenant
        const existing = await prisma.category.findFirst({
            where: {
                id,
                tenantId: tenant.tenantId
            },
            include: { _count: { select: { products: true } } }
        });

        if (!existing) {
            return NextResponse.json(
                { error: "Categoría no encontrada" },
                { status: 404 }
            );
        }

        // No permitir eliminar si tiene productos activos
        if (existing._count.products > 0) {
            return NextResponse.json(
                { error: `No se puede eliminar: tiene ${existing._count.products} productos asociados` },
                { status: 400 }
            );
        }

        // Soft delete
        await prisma.category.update({
            where: { id },
            data: { isActive: false }
        });

        return NextResponse.json({ message: "Categoría eliminada correctamente" });
    } catch (error) {
        console.error("Error deleting category:", error);
        return NextResponse.json(
            { error: "Error al eliminar categoría" },
            { status: 500 }
        );
    }
}
