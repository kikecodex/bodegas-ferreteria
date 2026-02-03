// Script para importar productos de Oropeza desde Excel
// Usar: npx tsx prisma/import-oropeza.ts

import { PrismaClient } from "@prisma/client";
import { PrismaNeon } from "@prisma/adapter-neon";
import * as XLSX from "xlsx";
import * as path from "path";
import dotenv from "dotenv";

// Cargar variables de entorno
dotenv.config();

// Conectar a Neon PostgreSQL
const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
    console.error("❌ ERROR: DATABASE_URL no está configurada en .env");
    process.exit(1);
}

const adapter = new PrismaNeon({ connectionString });
const prisma = new PrismaClient({ adapter });


// Mapeo de categorías
const CATEGORY_MAP: Record<string, { name: string; color: string; icon: string; description: string }> = {
    "ABARROTES": { name: "Abarrotes", color: "#22c55e", icon: "ShoppingBasket", description: "Productos de bodega y alimentos" },
    "FERRETERIA": { name: "Ferretería", color: "#f59e0b", icon: "Wrench", description: "Herramientas y accesorios" },
    "ENCENDEDOR": { name: "Encendedores", color: "#ef4444", icon: "Flame", description: "Encendedores y fósforos" },
    "AGUA": { name: "Bebidas", color: "#3b82f6", icon: "Droplets", description: "Agua y bebidas" },
    "ACCESORIO DE BAÑO": { name: "Baño", color: "#8b5cf6", icon: "Bath", description: "Accesorios de baño" },
};

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

async function main() {
    console.log("🚀 Iniciando importación de productos de Oropeza...\n");

    // Buscar o crear tenant
    let tenant = await prisma.tenant.findFirst({ where: { slug: "oropezas" } });

    if (!tenant) {
        console.log("📦 Creando tenant oropezas...");
        tenant = await prisma.tenant.create({
            data: {
                name: "Corporación Oropeza's E.I.R.L.",
                slug: "oropezas",
                ruc: "20123456789",
                address: "Av. Principal 123",
                phone: "999888777",
                email: "ventas@oropezas.com",
            }
        });
    }

    console.log(`✅ Tenant: ${tenant.name} (${tenant.id})\n`);

    // Leer Excel
    const excelPath = path.join(process.cwd(), "202623163825.xlsx");
    console.log(`📊 Leyendo archivo: ${excelPath}`);

    const workbook = XLSX.readFile(excelPath);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(worksheet) as Record<string, unknown>[];

    console.log(`📋 Encontrados ${data.length} registros en el Excel\n`);

    // Crear categorías
    console.log("📁 Creando categorías...");
    const categoryIds: Record<string, string> = {};

    for (const [key, config] of Object.entries(CATEGORY_MAP)) {
        const existing = await prisma.category.findFirst({
            where: { name: config.name, tenantId: tenant.id }
        });

        if (existing) {
            categoryIds[key] = existing.id;
        } else {
            const category = await prisma.category.create({
                data: {
                    name: config.name,
                    description: config.description,
                    color: config.color,
                    icon: config.icon,
                    tenantId: tenant.id
                }
            });
            categoryIds[key] = category.id;
        }
        console.log(`   ✓ ${config.name}`);
    }
    console.log("");

    // Procesar productos
    console.log("📦 Importando productos...");
    let created = 0;
    let updated = 0;
    let skipped = 0;
    let errors = 0;
    let autoCodeCounter = 1;

    for (let i = 0; i < data.length; i++) {
        const row = data[i];

        try {
            const rawCode = row["Codigo"] as string | number | undefined;
            const descripcion = row["Descripcion"] as string;
            const categoria = row["Categoria"] as string;
            const marca = row["Marca"] as string | undefined;
            const stock = Number(row["Stock"]) || 0;
            const precioCosto = Number(row["PrecioCosto"]) || 0;
            const precioVenta = Number(row["PrecioVenta"]) || 0;
            const unidadMedida = row["UnidadMedida"] as string | undefined;
            const minimoStock = Number(row["MinimoStock"]) || 5;

            if (!descripcion || String(descripcion).trim() === "") {
                skipped++;
                continue;
            }

            // Generar código
            let code: string;
            if (!rawCode || String(rawCode).trim() === "" || String(rawCode) === "NaN") {
                code = `ORO-${String(autoCodeCounter++).padStart(4, "0")}`;
            } else {
                code = String(rawCode).replace(/\s/g, "");
            }

            // Mapear categoría
            const catKey = String(categoria || "ABARROTES").toUpperCase().trim();
            const categoryId = categoryIds[catKey] || categoryIds["ABARROTES"];

            // Datos del producto
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

            // Verificar si existe
            const existing = await prisma.product.findFirst({
                where: { code, tenantId: tenant.id }
            });

            if (existing) {
                await prisma.product.update({
                    where: { id: existing.id },
                    data: productData
                });
                updated++;
            } else {
                await prisma.product.create({
                    data: { code, ...productData }
                });
                created++;
            }

            // Progreso
            if ((created + updated) % 100 === 0) {
                process.stdout.write(`\r   Procesados: ${created + updated}/${data.length}`);
            }
        } catch (err) {
            errors++;
            if (errors <= 5) {
                console.error(`\n   ❌ Error fila ${i + 2}: ${err}`);
            }
        }
    }

    console.log(`\n\n✅ Importación completada!`);
    console.log(`   📊 Total en Excel: ${data.length}`);
    console.log(`   ✅ Creados: ${created}`);
    console.log(`   🔄 Actualizados: ${updated}`);
    console.log(`   ⏭️  Omitidos: ${skipped}`);
    console.log(`   ❌ Errores: ${errors}`);

    // Verificar conteo final
    const totalProducts = await prisma.product.count({ where: { tenantId: tenant.id } });
    console.log(`\n📦 Total productos en BD: ${totalProducts}`);
}

main()
    .then(() => {
        prisma.$disconnect();
        process.exit(0);
    })
    .catch((e) => {
        console.error("Error fatal:", e);
        prisma.$disconnect();
        process.exit(1);
    });

