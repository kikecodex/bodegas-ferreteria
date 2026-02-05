import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getTenantFromSession } from "@/lib/tenant-context";

// DELETE /api/sales/clear-sales - Eliminar todas las ventas del tenant
// Requiere confirmación con el nombre del tenant
export async function DELETE(request: NextRequest) {
    try {
        const tenantContext = await getTenantFromSession();

        if (!tenantContext?.tenantId) {
            return NextResponse.json(
                { error: "No autorizado" },
                { status: 401 }
            );
        }

        // Nota: Cualquier usuario autenticado puede limpiar historial
        // La confirmación con el slug del tenant es la seguridad

        const body = await request.json();
        const { confirmation } = body;

        // Obtener nombre del tenant para confirmación
        const tenant = await prisma.tenant.findUnique({
            where: { id: tenantContext.tenantId },
            select: { name: true, slug: true }
        });

        if (!tenant) {
            return NextResponse.json(
                { error: "Tenant no encontrado" },
                { status: 404 }
            );
        }

        // Verificar confirmación
        const expectedConfirmation = tenant.slug || tenant.name.toLowerCase().replace(/\s+/g, "-");
        if (confirmation !== expectedConfirmation && confirmation !== "CONFIRMAR_ELIMINACION") {
            return NextResponse.json(
                {
                    error: "Confirmación incorrecta",
                    hint: `Escriba "${expectedConfirmation}" o "CONFIRMAR_ELIMINACION" para confirmar`
                },
                { status: 400 }
            );
        }

        // Eliminar ventas en orden correcto (items primero, luego ventas)
        const deletedItems = await prisma.saleItem.deleteMany({
            where: {
                sale: {
                    tenantId: tenantContext.tenantId
                }
            }
        });

        const deletedSales = await prisma.sale.deleteMany({
            where: {
                tenantId: tenantContext.tenantId
            }
        });

        return NextResponse.json({
            success: true,
            message: `Se eliminaron ${deletedSales.count} ventas y ${deletedItems.count} items`,
            deletedSales: deletedSales.count,
            deletedItems: deletedItems.count
        });

    } catch (error) {
        console.error("Error al limpiar historial:", error);
        return NextResponse.json(
            { error: "Error interno del servidor" },
            { status: 500 }
        );
    }
}

// GET - Obtener información para confirmación
export async function GET() {
    try {
        const tenantContext = await getTenantFromSession();

        if (!tenantContext?.tenantId) {
            return NextResponse.json(
                { error: "No autorizado" },
                { status: 401 }
            );
        }

        const tenant = await prisma.tenant.findUnique({
            where: { id: tenantContext.tenantId },
            select: { name: true, slug: true }
        });

        const salesCount = await prisma.sale.count({
            where: { tenantId: tenantContext.tenantId }
        });

        return NextResponse.json({
            tenantName: tenant?.name,
            confirmationCode: tenant?.slug || tenant?.name?.toLowerCase().replace(/\s+/g, "-"),
            salesCount
        });

    } catch (error) {
        console.error("Error:", error);
        return NextResponse.json(
            { error: "Error interno" },
            { status: 500 }
        );
    }
}
