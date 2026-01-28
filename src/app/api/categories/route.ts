import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getTenantFromSession } from "@/lib/tenant-context";

// GET /api/categories - Lista todas las categorías con conteo de productos
export async function GET() {
    try {
        // Obtener contexto de tenant
        const tenant = await getTenantFromSession();
        if (!tenant) {
            return NextResponse.json(
                { error: "No autenticado o tenant no válido" },
                { status: 401 }
            );
        }

        const categories = await prisma.category.findMany({
            where: {
                isActive: true,
                tenantId: tenant.tenantId
            },
            include: {
                _count: {
                    select: { products: true }
                }
            },
            orderBy: { name: "asc" }
        });

        return NextResponse.json(categories);
    } catch (error) {
        console.error("Error fetching categories:", error);
        return NextResponse.json(
            { error: "Error al obtener categorías" },
            { status: 500 }
        );
    }
}

// POST /api/categories - Crea una nueva categoría
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
        const { name, description, color, icon } = body;

        if (!name || name.trim() === "") {
            return NextResponse.json(
                { error: "El nombre es requerido" },
                { status: 400 }
            );
        }

        // Verificar si ya existe en este tenant
        const existing = await prisma.category.findFirst({
            where: {
                name: name.trim(),
                tenantId: tenant.tenantId
            }
        });

        if (existing) {
            return NextResponse.json(
                { error: "Ya existe una categoría con ese nombre" },
                { status: 409 }
            );
        }

        const category = await prisma.category.create({
            data: {
                name: name.trim(),
                description: description?.trim() || null,
                color: color || "#6b7280",
                icon: icon || "Package",
                tenantId: tenant.tenantId
            }
        });

        return NextResponse.json(category, { status: 201 });
    } catch (error) {
        console.error("Error creating category:", error);
        return NextResponse.json(
            { error: "Error al crear categoría" },
            { status: 500 }
        );
    }
}
