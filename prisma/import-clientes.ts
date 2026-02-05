// Script para importar clientes de Oropeza desde Excel
// Usar: npx tsx prisma/import-clientes.ts

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

interface ClienteExcel {
    TipoDocumento: string;
    NroDocumento: string;
    Nombres: string;
    Direccion: string;
    Telefono?: string;
    Email?: string;
    LimiteCredito?: number;
    DiasCredito?: number;
    Departamento?: string;
    Provincia?: string;
    Distrito?: string;
}

async function importClientes() {
    console.log("🚀 Iniciando importación de clientes de Oropeza...\n");

    // Buscar tenant de Oropeza
    const tenant = await prisma.tenant.findFirst({ where: { slug: "oropezas" } });

    if (!tenant) {
        console.error("❌ Tenant oropezas no encontrado");
        process.exit(1);
    }

    console.log(`✅ Tenant encontrado: ${tenant.name}\n`);

    // Leer archivo Excel
    const excelPath = path.join(process.cwd(), "clientes.xlsx");
    const workbook = XLSX.readFile(excelPath);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];

    const data: ClienteExcel[] = XLSX.utils.sheet_to_json(worksheet);

    console.log(`📊 Clientes encontrados en Excel: ${data.length}\n`);

    let created = 0;
    let skipped = 0;

    for (const row of data) {
        try {
            // Validar datos mínimos
            const documento = String(row.NroDocumento || "").trim();
            const nombre = String(row.Nombres || "").trim();

            if (!documento || !nombre) {
                console.log(`⚠️ Saltando fila sin documento o nombre`);
                skipped++;
                continue;
            }

            // Determinar tipo de documento
            let tipoDoc = "DNI";
            if (row.TipoDocumento === "RUC" || documento.length === 11) {
                tipoDoc = "RUC";
            }

            // Usar upsert para crear o actualizar
            await prisma.client.upsert({
                where: {
                    tenantId_document: {
                        tenantId: tenant.id,
                        document: documento
                    }
                },
                update: {
                    name: nombre,
                    address: row.Direccion && row.Direccion !== "-" ? row.Direccion : null,
                    phone: row.Telefono ? String(row.Telefono) : null,
                    email: row.Email ? String(row.Email) : null,
                    creditLimit: row.LimiteCredito ? Number(row.LimiteCredito) : null,
                },
                create: {
                    documentType: tipoDoc,
                    document: documento,
                    name: nombre,
                    address: row.Direccion && row.Direccion !== "-" ? row.Direccion : null,
                    phone: row.Telefono ? String(row.Telefono) : null,
                    email: row.Email ? String(row.Email) : null,
                    creditLimit: row.LimiteCredito ? Number(row.LimiteCredito) : null,
                    tenantId: tenant.id,
                    isActive: true
                }
            });

            console.log(`✅ Procesado: ${nombre} (${documento})`);
            created++;
        } catch (error) {
            console.error(`❌ Error con cliente ${row.Nombres}:`, error);
            skipped++;
        }
    }

    console.log("\n" + "=".repeat(50));
    console.log("📊 RESUMEN DE IMPORTACIÓN");
    console.log("=".repeat(50));
    console.log(`✅ Clientes procesados: ${created}`);
    console.log(`⚠️ Saltados/errores: ${skipped}`);
    console.log(`📊 Total en Excel: ${data.length}`);
    console.log("=".repeat(50));

    // Verificar total de clientes
    const totalClientes = await prisma.client.count({
        where: { tenantId: tenant.id }
    });
    console.log(`\n🏪 Total de clientes en el sistema: ${totalClientes}`);
}

importClientes()
    .then(() => {
        prisma.$disconnect();
        process.exit(0);
    })
    .catch((e) => {
        console.error("Error fatal:", e);
        prisma.$disconnect();
        process.exit(1);
    });
