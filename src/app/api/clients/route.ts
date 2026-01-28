import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getTenantFromSession } from "@/lib/tenant-context";

// GET /api/clients - Lista clientes con paginación y filtros
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
        const segment = searchParams.get("segment") || "";
        const hasDebt = searchParams.get("hasDebt");
        const isActive = searchParams.get("isActive") !== "false";

        // Construir where clause con tenantId
        const where: Record<string, unknown> = {
            isActive,
            tenantId: tenant.tenantId
        };

        if (search) {
            where.OR = [
                { name: { contains: search } },
                { document: { contains: search } },
                { email: { contains: search } },
                { phone: { contains: search } }
            ];
        }

        if (segment) {
            where.segment = segment;
        }

        if (hasDebt === "true") {
            where.currentDebt = { gt: 0 };
        }

        // Obtener clientes
        const [clients, total] = await Promise.all([
            prisma.client.findMany({
                where,
                include: {
                    _count: {
                        select: { sales: true }
                    }
                },
                orderBy: { name: "asc" },
                skip,
                take: limit
            }),
            prisma.client.count({ where })
        ]);

        return NextResponse.json({
            clients,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit)
            }
        });
    } catch (error) {
        console.error("Error fetching clients:", error);
        return NextResponse.json(
            { error: "Error al obtener clientes" },
            { status: 500 }
        );
    }
}

// POST /api/clients - Crea un nuevo cliente
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
            documentType,
            document,
            name,
            phone,
            email,
            address,
            creditLimit,
            segment
        } = body;

        // Validaciones
        if (!document || !name) {
            return NextResponse.json(
                { error: "Documento y nombre son requeridos" },
                { status: 400 }
            );
        }

        // Validar formato de documento
        const docTrimmed = document.trim();
        if (documentType === "DNI" && !/^\d{8}$/.test(docTrimmed)) {
            return NextResponse.json(
                { error: "DNI debe tener exactamente 8 dígitos" },
                { status: 400 }
            );
        }

        if (documentType === "RUC" && !/^(10|20)\d{9}$/.test(docTrimmed)) {
            return NextResponse.json(
                { error: "RUC debe tener 11 dígitos y comenzar con 10 o 20" },
                { status: 400 }
            );
        }

        // Verificar documento único en este tenant
        const existing = await prisma.client.findFirst({
            where: {
                document: docTrimmed,
                tenantId: tenant.tenantId
            }
        });

        if (existing) {
            return NextResponse.json(
                { error: "Ya existe un cliente con ese documento" },
                { status: 409 }
            );
        }

        // Crear cliente
        const client = await prisma.client.create({
            data: {
                documentType: documentType || "DNI",
                document: docTrimmed,
                name: name.trim(),
                phone: phone?.trim() || null,
                email: email?.trim() || null,
                address: address?.trim() || null,
                creditLimit: creditLimit ? parseFloat(creditLimit) : null,
                segment: segment || "REGULAR",
                tenantId: tenant.tenantId
            }
        });

        return NextResponse.json(client, { status: 201 });
    } catch (error) {
        console.error("Error creating client:", error);
        return NextResponse.json(
            { error: "Error al crear cliente" },
            { status: 500 }
        );
    }
}
