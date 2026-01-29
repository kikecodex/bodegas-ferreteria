import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/seed-products - Crear productos de ejemplo para Oropeza's
export async function GET() {
    return seedProducts();
}

export async function POST() {
    return seedProducts();
}

async function seedProducts() {
    try {
        // Buscar tenant de Oropeza's
        const tenant = await prisma.tenant.findFirst({
            where: { slug: "oropezas" }
        });

        if (!tenant) {
            return NextResponse.json({
                error: "Primero ejecuta /api/fix-tenant para crear el tenant"
            }, { status: 400 });
        }

        // Crear categorías
        const categories = await Promise.all([
            prisma.category.upsert({
                where: { tenantId_name: { tenantId: tenant.id, name: "Construcción" } },
                update: {},
                create: {
                    name: "Construcción",
                    description: "Materiales de construcción",
                    color: "#dc2626",
                    icon: "Hammer",
                    tenantId: tenant.id
                }
            }),
            prisma.category.upsert({
                where: { tenantId_name: { tenantId: tenant.id, name: "Ferretería" } },
                update: {},
                create: {
                    name: "Ferretería",
                    description: "Herramientas y accesorios",
                    color: "#f59e0b",
                    icon: "Wrench",
                    tenantId: tenant.id
                }
            }),
            prisma.category.upsert({
                where: { tenantId_name: { tenantId: tenant.id, name: "Pinturas" } },
                update: {},
                create: {
                    name: "Pinturas",
                    description: "Pinturas y acabados",
                    color: "#8b5cf6",
                    icon: "Paintbrush",
                    tenantId: tenant.id
                }
            }),
            prisma.category.upsert({
                where: { tenantId_name: { tenantId: tenant.id, name: "Electricidad" } },
                update: {},
                create: {
                    name: "Electricidad",
                    description: "Material eléctrico",
                    color: "#eab308",
                    icon: "Zap",
                    tenantId: tenant.id
                }
            }),
            prisma.category.upsert({
                where: { tenantId_name: { tenantId: tenant.id, name: "Plomería" } },
                update: {},
                create: {
                    name: "Plomería",
                    description: "Tubos y accesorios",
                    color: "#3b82f6",
                    icon: "Droplets",
                    tenantId: tenant.id
                }
            }),
            prisma.category.upsert({
                where: { tenantId_name: { tenantId: tenant.id, name: "Abarrotes" } },
                update: {},
                create: {
                    name: "Abarrotes",
                    description: "Productos de bodega",
                    color: "#22c55e",
                    icon: "ShoppingBasket",
                    tenantId: tenant.id
                }
            })
        ]);

        const [construccion, ferreteria, pinturas, electricidad, plomeria, abarrotes] = categories;

        // Crear productos de FERRETERÍA
        const productosData = [
            // Construcción
            { code: "CONST-001", name: "Cemento Portland 42.5kg", price: 32.50, cost: 25.00, stock: 150, minStock: 20, unit: "BOLSA", categoryId: construccion.id },
            { code: "CONST-002", name: 'Fierro Corrugado 1/2"', price: 45.00, cost: 35.00, stock: 200, minStock: 50, unit: "VARILLA", categoryId: construccion.id },
            { code: "CONST-003", name: "Arena Fina m³", price: 85.00, cost: 65.00, stock: 50, minStock: 10, unit: "M3", categoryId: construccion.id },
            { code: "CONST-004", name: "Ladrillo King Kong 18 huecos", price: 0.85, cost: 0.60, stock: 5000, minStock: 500, unit: "UND", categoryId: construccion.id },

            // Ferretería
            { code: "FERR-001", name: "Martillo de uña 16oz", price: 35.00, cost: 22.00, stock: 25, minStock: 5, unit: "UND", categoryId: ferreteria.id },
            { code: "FERR-002", name: "Destornillador plano 6\"", price: 12.00, cost: 7.00, stock: 40, minStock: 10, unit: "UND", categoryId: ferreteria.id },
            { code: "FERR-003", name: "Alicate universal 8\"", price: 28.00, cost: 18.00, stock: 30, minStock: 5, unit: "UND", categoryId: ferreteria.id },
            { code: "FERR-004", name: "Cinta métrica 5m", price: 15.00, cost: 9.00, stock: 50, minStock: 10, unit: "UND", categoryId: ferreteria.id },

            // Pinturas
            { code: "PINT-001", name: "Pintura Látex Blanco 4L", price: 68.00, cost: 48.00, stock: 35, minStock: 15, unit: "GALÓN", categoryId: pinturas.id },
            { code: "PINT-002", name: "Esmalte Sintético Negro 1L", price: 32.00, cost: 22.00, stock: 25, minStock: 10, unit: "LITRO", categoryId: pinturas.id },
            { code: "PINT-003", name: "Brocha 4\"", price: 18.00, cost: 10.00, stock: 60, minStock: 15, unit: "UND", categoryId: pinturas.id },

            // Electricidad
            { code: "ELEC-001", name: "Cable THW 14 AWG Rojo 100m", price: 185.00, cost: 140.00, stock: 15, minStock: 5, unit: "ROLLO", categoryId: electricidad.id },
            { code: "ELEC-002", name: "Interruptor Simple", price: 8.00, cost: 4.50, stock: 100, minStock: 20, unit: "UND", categoryId: electricidad.id },
            { code: "ELEC-003", name: "Tomacorriente Doble", price: 12.00, cost: 7.00, stock: 80, minStock: 20, unit: "UND", categoryId: electricidad.id },

            // Plomería
            { code: "PLOM-001", name: 'Tubo PVC 4" x 3m', price: 28.00, cost: 18.00, stock: 45, minStock: 10, unit: "UND", categoryId: plomeria.id },
            { code: "PLOM-002", name: 'Codo PVC 4" x 90°', price: 8.00, cost: 4.50, stock: 100, minStock: 20, unit: "UND", categoryId: plomeria.id },
            { code: "PLOM-003", name: "Pegamento PVC 1/4 gal", price: 45.00, cost: 32.00, stock: 20, minStock: 5, unit: "UND", categoryId: plomeria.id },

            // Abarrotes/Bodega
            { code: "ABAR-001", name: "Arroz Extra 50kg", price: 165.00, cost: 140.00, stock: 30, minStock: 10, unit: "SACO", categoryId: abarrotes.id },
            { code: "ABAR-002", name: "Azúcar Rubia 50kg", price: 155.00, cost: 130.00, stock: 25, minStock: 8, unit: "SACO", categoryId: abarrotes.id },
            { code: "ABAR-003", name: "Aceite Vegetal 1L", price: 12.00, cost: 9.00, stock: 100, minStock: 30, unit: "UND", categoryId: abarrotes.id },
            { code: "ABAR-004", name: "Fideos Spaghetti 500g", price: 4.50, cost: 3.20, stock: 200, minStock: 50, unit: "UND", categoryId: abarrotes.id },
            { code: "ABAR-005", name: "Leche Gloria 400ml", price: 4.20, cost: 3.50, stock: 150, minStock: 40, unit: "UND", categoryId: abarrotes.id },
        ];

        // Crear productos
        let created = 0;
        let existing = 0;

        for (const prod of productosData) {
            const exists = await prisma.product.findFirst({
                where: { code: prod.code, tenantId: tenant.id }
            });

            if (!exists) {
                await prisma.product.create({
                    data: {
                        ...prod,
                        tenantId: tenant.id,
                        description: `Producto ${prod.name}`,
                        isActive: true
                    }
                });
                created++;
            } else {
                existing++;
            }
        }

        // Crear clientes de ejemplo
        const clientesCreados = await Promise.all([
            prisma.client.upsert({
                where: { tenantId_document: { tenantId: tenant.id, document: "12345678" } },
                update: {},
                create: {
                    documentType: "DNI",
                    document: "12345678",
                    name: "Juan Carlos Pérez García",
                    phone: "999111222",
                    email: "juan.perez@email.com",
                    address: "Av. Principal 123, Lima",
                    segment: "FRECUENTE",
                    tenantId: tenant.id
                }
            }),
            prisma.client.upsert({
                where: { tenantId_document: { tenantId: tenant.id, document: "20123456789" } },
                update: {},
                create: {
                    documentType: "RUC",
                    document: "20123456789",
                    name: "Constructora Los Andes SAC",
                    phone: "014567890",
                    email: "compras@losandes.com",
                    address: "Jr. Industrial 456, Callao",
                    segment: "VIP",
                    creditLimit: 50000.00,
                    tenantId: tenant.id
                }
            }),
            prisma.client.upsert({
                where: { tenantId_document: { tenantId: tenant.id, document: "87654321" } },
                update: {},
                create: {
                    documentType: "DNI",
                    document: "87654321",
                    name: "María Elena Rodríguez",
                    phone: "999333444",
                    segment: "REGULAR",
                    tenantId: tenant.id
                }
            })
        ]);

        return NextResponse.json({
            success: true,
            message: "Datos de ejemplo creados para Oropeza's",
            tenant: tenant.name,
            categories: categories.length,
            products: { created, existing, total: productosData.length },
            clients: clientesCreados.length
        });

    } catch (error) {
        console.error("Error seeding products:", error);
        return NextResponse.json({
            error: "Error al crear productos",
            details: String(error)
        }, { status: 500 });
    }
}
