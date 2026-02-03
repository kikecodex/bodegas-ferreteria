import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import * as XLSX from "xlsx";
import * as fs from "fs";
import * as path from "path";

// Mapeo de categorías del Excel a configuración del sistema
const CATEGORY_MAP: Record<string, { name: string; color: string; icon: string; description: string }> = {
    "ABARROTES": { name: "Abarrotes", color: "#22c55e", icon: "ShoppingBasket", description: "Productos de bodega y alimentos" },
    "FERRETERIA": { name: "Ferretería", color: "#f59e0b", icon: "Wrench", description: "Herramientas y accesorios" },
    "ENCENDEDOR": { name: "Encendedores", color: "#ef4444", icon: "Flame", description: "Encendedores y fósforos" },
    "AGUA": { name: "Bebidas", color: "#3b82f6", icon: "Droplets", description: "Agua y bebidas" },
    "ACCESORIO DE BAÑO": { name: "Baño", color: "#8b5cf6", icon: "Bath", description: "Accesorios de baño" },
};

// Normalizar unidad de medida
function normalizeUnit(unit: string | undefined): string {
    if (!unit) return "UND";
    const u = String(unit).toUpperCase().trim();
    if (u.includes("UNIDAD")) return "UND";
    if (u.includes("PAQUETE")) return "PAQUETE";
    if (u.includes("CAJA")) return "CAJA";
    if (u.includes("DOCENA")) return "DOCENA";
    if (u.includes("KILO") || u.includes("KG")) return "KG";
    if (u.includes("LITRO") || u.includes("LT")) return "LITRO";
    if (u.includes("METRO") || u.includes("MT")) return "METRO";
    return "UND";
}

// POST /api/import-oropeza - Importar productos desde Excel de Oropeza
export async function POST() {
    try {
        // Buscar tenant de Oropeza's
        const tenant = await prisma.tenant.findFirst({
            where: { slug: "oropezas" }
        });

        if (!tenant) {
            return NextResponse.json({
                error: "Tenant 'oropezas' no encontrado. Ejecuta /api/fix-tenant primero."
            }, { status: 400 });
        }

        // Leer archivo Excel
        const excelPath = path.join(process.cwd(), "202623163825.xlsx");

        if (!fs.existsSync(excelPath)) {
            return NextResponse.json({
                error: `Archivo Excel no encontrado: ${excelPath}`
            }, { status: 400 });
        }

        const workbook = XLSX.readFile(excelPath);
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const data = XLSX.utils.sheet_to_json(worksheet) as Record<string, unknown>[];

        console.log(`📊 Encontrados ${data.length} productos en el Excel`);

        // Paso 1: Crear categorías
        const categoryIds: Record<string, string> = {};

        for (const [key, config] of Object.entries(CATEGORY_MAP)) {
            const category = await prisma.category.upsert({
                where: { tenantId_name: { tenantId: tenant.id, name: config.name } },
                update: {},
                create: {
                    name: config.name,
                    description: config.description,
                    color: config.color,
                    icon: config.icon,
                    tenantId: tenant.id
                }
            });
            categoryIds[key] = category.id;
        }

        console.log(`✅ Creadas ${Object.keys(categoryIds).length} categorías`);

        // Paso 2: Procesar productos
        let created = 0;
        let updated = 0;
        let errors = 0;
        let skipped = 0;
        const errorDetails: string[] = [];

        // Generar códigos únicos para productos sin código
        let autoCodeCounter = 1;

        for (let i = 0; i < data.length; i++) {
            const row = data[i];

            try {
                // Extraer datos del Excel
                const rawCode = row["Codigo"] as string | number | undefined;
                const descripcion = row["Descripcion"] as string;
                const categoria = row["Categoria"] as string;
                const marca = row["Marca"] as string | undefined;
                const stock = Number(row["Stock"]) || 0;
                const precioCosto = Number(row["PrecioCosto"]) || 0;
                const precioVenta = Number(row["PrecioVenta"]) || 0;
                const unidadMedida = row["UnidadMedida"] as string | undefined;
                const minimoStock = Number(row["MinimoStock"]) || 5;

                // Validar descripción (requerido)
                if (!descripcion || String(descripcion).trim() === "") {
                    skipped++;
                    continue;
                }

                // Generar código si no existe
                let code: string;
                if (!rawCode || String(rawCode).trim() === "" || rawCode === "NaN") {
                    code = `ORO-${String(autoCodeCounter++).padStart(4, "0")}`;
                } else {
                    code = String(rawCode).trim();
                }

                // Mapear categoría
                const catKey = String(categoria || "ABARROTES").toUpperCase().trim();
                const categoryId = categoryIds[catKey] || categoryIds["ABARROTES"];

                // Preparar datos del producto
                const productData = {
                    name: String(descripcion).trim().substring(0, 200),
                    description: marca ? `Marca: ${marca}` : null,
                    price: precioVenta > 0 ? precioVenta : (precioCosto > 0 ? precioCosto * 1.3 : 1),
                    cost: precioCosto > 0 ? precioCosto : 0,
                    stock: Math.max(0, Math.floor(stock)),
                    minStock: Math.max(1, Math.floor(minimoStock)),
                    unit: normalizeUnit(unidadMedida),
                    categoryId,
                    tenantId: tenant.id,
                    isActive: true,
                };

                // Upsert producto
                const existingProduct = await prisma.product.findFirst({
                    where: { code, tenantId: tenant.id }
                });

                if (existingProduct) {
                    await prisma.product.update({
                        where: { id: existingProduct.id },
                        data: productData
                    });
                    updated++;
                } else {
                    await prisma.product.create({
                        data: {
                            code,
                            ...productData
                        }
                    });
                    created++;
                }

                // Log progreso cada 100 productos
                if ((created + updated) % 100 === 0) {
                    console.log(`⏳ Procesados ${created + updated} productos...`);
                }

            } catch (err) {
                errors++;
                const errorMsg = `Fila ${i + 2}: ${err instanceof Error ? err.message : String(err)}`;
                if (errorDetails.length < 10) {
                    errorDetails.push(errorMsg);
                }
            }
        }

        console.log(`🎉 Importación completada: ${created} creados, ${updated} actualizados, ${errors} errores, ${skipped} omitidos`);

        return NextResponse.json({
            success: true,
            message: "Importación completada",
            tenant: tenant.name,
            statistics: {
                total: data.length,
                created,
                updated,
                errors,
                skipped,
            },
            categories: Object.keys(categoryIds).length,
            errorDetails: errorDetails.length > 0 ? errorDetails : undefined
        });

    } catch (error) {
        console.error("Error en importación:", error);
        return NextResponse.json({
            error: "Error en la importación",
            details: error instanceof Error ? error.message : String(error)
        }, { status: 500 });
    }
}

// GET - Información del endpoint
export async function GET() {
    return NextResponse.json({
        endpoint: "/api/import-oropeza",
        method: "POST",
        description: "Importa productos desde el archivo Excel 202623163825.xlsx",
        expectedFile: "202623163825.xlsx en el directorio raíz del proyecto",
        categories: Object.keys(CATEGORY_MAP)
    });
}
