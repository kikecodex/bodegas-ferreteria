// Verificar productos importados
// Ejecutar: npx tsx prisma/verify-import.ts

import { PrismaClient } from "@prisma/client";
import { PrismaNeon } from "@prisma/adapter-neon";
import dotenv from "dotenv";

dotenv.config();

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
    console.error("❌ DATABASE_URL no configurada");
    process.exit(1);
}

const adapter = new PrismaNeon({ connectionString });
const prisma = new PrismaClient({ adapter });

async function main() {
    console.log("🔍 Verificando importación de productos...\n");

    // Buscar tenant
    const tenant = await prisma.tenant.findFirst({ where: { slug: "oropezas" } });
    if (!tenant) {
        console.error("❌ Tenant oropezas no encontrado");
        return;
    }

    // Conteo total
    const totalProducts = await prisma.product.count({ where: { tenantId: tenant.id } });
    console.log(`📦 Total productos: ${totalProducts}`);

    // Conteo por categoría
    const categories = await prisma.category.findMany({
        where: { tenantId: tenant.id },
        include: { _count: { select: { products: true } } }
    });

    console.log("\n📁 Productos por categoría:");
    for (const cat of categories) {
        console.log(`   ${cat.name}: ${cat._count.products}`);
    }

    // Muestra de productos
    const sampleProducts = await prisma.product.findMany({
        where: { tenantId: tenant.id },
        take: 5,
        include: { category: true }
    });

    console.log("\n📋 Muestra de productos:");
    for (const p of sampleProducts) {
        console.log(`   [${p.code}] ${p.name} - S/${p.price.toFixed(2)} (${p.category?.name})`);
    }

    // Verificar stock
    const withStock = await prisma.product.count({
        where: { tenantId: tenant.id, stock: { gt: 0 } }
    });
    console.log(`\n📊 Productos con stock > 0: ${withStock}`);

    console.log("\n✅ Verificación completada!");
}

main()
    .then(() => {
        prisma.$disconnect();
        process.exit(0);
    })
    .catch((e) => {
        console.error("Error:", e);
        prisma.$disconnect();
        process.exit(1);
    });
