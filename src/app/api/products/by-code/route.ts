import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getTenantFromSession } from "@/lib/tenant-context";

// GET /api/products/by-code?code=XXX - Busca producto por código de barras
// Busca en Product.code y UnitOfMeasure.barcode
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
        const code = searchParams.get("code");

        if (!code) {
            return NextResponse.json(
                { error: "Código es requerido" },
                { status: 400 }
            );
        }

        // Primero buscar en código principal del producto (filtrado por tenant)
        let product = await prisma.product.findFirst({
            where: {
                code: code.trim(),
                tenantId: tenant.tenantId
            },
            include: {
                category: true,
                unitsOfMeasure: {
                    where: { isActive: true },
                    orderBy: { conversionFactor: "asc" }
                }
            }
        });

        let matchedUnit = null;

        // Si no encuentra, buscar en códigos de barras de unidades de medida
        if (!product) {
            const unitMatch = await prisma.unitOfMeasure.findFirst({
                where: {
                    barcode: code.trim(),
                    isActive: true,
                    product: {
                        tenantId: tenant.tenantId
                    }
                },
                include: {
                    product: {
                        include: {
                            category: true,
                            unitsOfMeasure: {
                                where: { isActive: true },
                                orderBy: { conversionFactor: "asc" }
                            }
                        }
                    }
                }
            });

            if (unitMatch) {
                product = unitMatch.product;
                matchedUnit = {
                    id: unitMatch.id,
                    name: unitMatch.name,
                    abbreviation: unitMatch.abbreviation,
                    conversionFactor: unitMatch.conversionFactor,
                    price: unitMatch.price
                };
            }
        }

        if (!product) {
            return NextResponse.json(
                {
                    found: false,
                    code: code.trim(),
                    message: "Producto no encontrado"
                },
                { status: 200 } // 200 para indicar que la búsqueda fue exitosa pero no hay resultados
            );
        }

        return NextResponse.json({
            found: true,
            product,
            matchedUnit // Indica qué unidad de medida coincidió (si aplica)
        });
    } catch (error) {
        console.error("Error searching product by code:", error);
        return NextResponse.json(
            { error: "Error al buscar producto" },
            { status: 500 }
        );
    }
}
