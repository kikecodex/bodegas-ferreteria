import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getTenantFromSession } from "@/lib/tenant-context";

// GET /api/clients/[id] - Obtener cliente por ID
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
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

        const client = await prisma.client.findFirst({
            where: {
                id,
                tenantId: tenant.tenantId
            },
            include: {
                _count: {
                    select: { sales: true }
                },
                sales: {
                    take: 5,
                    orderBy: { createdAt: "desc" },
                    select: {
                        id: true,
                        number: true,
                        total: true,
                        createdAt: true,
                        status: true
                    }
                }
            }
        });

        if (!client) {
            return NextResponse.json(
                { error: "Cliente no encontrado" },
                { status: 404 }
            );
        }

        return NextResponse.json(client);
    } catch (error) {
        console.error("Error fetching client:", error);
        return NextResponse.json(
            { error: "Error al obtener cliente" },
            { status: 500 }
        );
    }
}

// PUT /api/clients/[id] - Actualizar cliente
export async function PUT(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
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
            documentType,
            document,
            name,
            phone,
            email,
            address,
            creditLimit,
            segment
        } = body;

        // Verificar que existe y pertenece al tenant
        const existing = await prisma.client.findFirst({
            where: {
                id,
                tenantId: tenant.tenantId
            }
        });

        if (!existing) {
            return NextResponse.json(
                { error: "Cliente no encontrado" },
                { status: 404 }
            );
        }

        // Si cambia el documento, verificar que no exista en este tenant
        if (document && document !== existing.document) {
            const docTrimmed = document.trim();

            // Validar formato
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

            const duplicate = await prisma.client.findFirst({
                where: {
                    document: docTrimmed,
                    tenantId: tenant.tenantId,
                    id: { not: id }
                }
            });

            if (duplicate) {
                return NextResponse.json(
                    { error: "Ya existe otro cliente con ese documento" },
                    { status: 409 }
                );
            }
        }

        // Actualizar cliente
        const client = await prisma.client.update({
            where: { id },
            data: {
                documentType: documentType || undefined,
                document: document?.trim() || undefined,
                name: name?.trim() || undefined,
                phone: phone?.trim() || null,
                email: email?.trim() || null,
                address: address?.trim() || null,
                creditLimit: creditLimit !== undefined ? (creditLimit ? parseFloat(creditLimit) : null) : undefined,
                segment: segment || undefined
            }
        });

        return NextResponse.json(client);
    } catch (error) {
        console.error("Error updating client:", error);
        return NextResponse.json(
            { error: "Error al actualizar cliente" },
            { status: 500 }
        );
    }
}

// DELETE /api/clients/[id] - Soft delete cliente
export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
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
        const existing = await prisma.client.findFirst({
            where: {
                id,
                tenantId: tenant.tenantId
            },
            include: { _count: { select: { sales: true } } }
        });

        if (!existing) {
            return NextResponse.json(
                { error: "Cliente no encontrado" },
                { status: 404 }
            );
        }

        // Soft delete
        await prisma.client.update({
            where: { id },
            data: { isActive: false }
        });

        return NextResponse.json({
            success: true,
            message: "Cliente desactivado",
            salesCount: existing._count.sales
        });
    } catch (error) {
        console.error("Error deleting client:", error);
        return NextResponse.json(
            { error: "Error al eliminar cliente" },
            { status: 500 }
        );
    }
}
