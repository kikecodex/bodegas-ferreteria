import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getTenantFromSession } from "@/lib/tenant-context";

// GET /api/suppliers - Listar proveedores
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
        const search = searchParams.get("search") || "";
        const page = parseInt(searchParams.get("page") || "1");
        const limit = parseInt(searchParams.get("limit") || "20");
        const skip = (page - 1) * limit;
        const activeOnly = searchParams.get("active") !== "false";

        const where: Record<string, unknown> = {
            tenantId: tenant.tenantId
        };

        if (activeOnly) {
            where.isActive = true;
        }

        if (search) {
            where.OR = [
                { name: { contains: search } },
                { ruc: { contains: search } },
                { tradeName: { contains: search } }
            ];
        }

        const [suppliers, total] = await Promise.all([
            prisma.supplier.findMany({
                where,
                orderBy: { name: "asc" },
                skip,
                take: limit,
                include: {
                    _count: {
                        select: { purchases: true }
                    }
                }
            }),
            prisma.supplier.count({ where })
        ]);

        return NextResponse.json({
            suppliers,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit)
            }
        });
    } catch (error) {
        console.error("Error fetching suppliers:", error);
        return NextResponse.json(
            { error: "Error al obtener proveedores" },
            { status: 500 }
        );
    }
}

// POST /api/suppliers - Crear proveedor
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
        const { ruc, name, tradeName, phone, email, address, bankName, bankAccount } = body;

        if (!ruc || !name) {
            return NextResponse.json(
                { error: "RUC y nombre son requeridos" },
                { status: 400 }
            );
        }

        // Verificar RUC único en este tenant
        const existing = await prisma.supplier.findFirst({
            where: {
                ruc,
                tenantId: tenant.tenantId
            }
        });

        if (existing) {
            return NextResponse.json(
                { error: "Ya existe un proveedor con ese RUC" },
                { status: 400 }
            );
        }

        const supplier = await prisma.supplier.create({
            data: {
                ruc,
                name,
                tradeName: tradeName || null,
                phone: phone || null,
                email: email || null,
                address: address || null,
                bankName: bankName || null,
                bankAccount: bankAccount || null,
                tenantId: tenant.tenantId
            }
        });

        return NextResponse.json(supplier, { status: 201 });
    } catch (error) {
        console.error("Error creating supplier:", error);
        return NextResponse.json(
            { error: "Error al crear proveedor" },
            { status: 500 }
        );
    }
}
