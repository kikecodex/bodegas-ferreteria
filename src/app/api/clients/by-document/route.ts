import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getTenantFromSession } from "@/lib/tenant-context";

// GET /api/clients/by-document?document=12345678 - Buscar por DNI/RUC
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
        const document = searchParams.get("document");

        if (!document) {
            return NextResponse.json(
                { error: "Documento es requerido" },
                { status: 400 }
            );
        }

        const client = await prisma.client.findFirst({
            where: {
                document: document.trim(),
                tenantId: tenant.tenantId
            },
            include: {
                _count: {
                    select: { sales: true }
                }
            }
        });

        if (!client) {
            return NextResponse.json({
                found: false,
                document: document.trim()
            });
        }

        return NextResponse.json({
            found: true,
            client
        });
    } catch (error) {
        console.error("Error searching client:", error);
        return NextResponse.json(
            { error: "Error al buscar cliente" },
            { status: 500 }
        );
    }
}
