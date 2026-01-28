const { PrismaClient } = require("@prisma/client");
const { PrismaBetterSQLite3 } = require("@prisma/adapter-better-sqlite3");
const Database = require("better-sqlite3");

// Create better-sqlite3 database connection
const sqlite = new Database("prisma/dev.db");

// Create Prisma adapter
const adapter = new PrismaBetterSQLite3(sqlite);

// Initialize Prisma Client with adapter
const prisma = new PrismaClient({ adapter });

// Simple hash function (in production use bcrypt)
function simpleHash(password) {
    return Buffer.from(password).toString('base64');
}

async function main() {
    console.log("🌱 Seeding database...");

    const hashedPassword = simpleHash("admin123");

    // Create admin user
    const admin = await prisma.user.upsert({
        where: { email: "admin@oropezas.com" },
        update: {},
        create: {
            email: "admin@oropezas.com",
            name: "Administrador",
            password: hashedPassword,
            role: "ADMIN",
            phone: "999888777",
        },
    });
    console.log("✅ Created admin user:", admin.email);

    const vendedor = await prisma.user.upsert({
        where: { email: "vendedor@oropezas.com" },
        update: {},
        create: {
            email: "vendedor@oropezas.com",
            name: "Juan Vendedor",
            password: hashedPassword,
            role: "VENDEDOR",
            phone: "999777666",
        },
    });
    console.log("✅ Created vendedor user:", vendedor.email);

    // Create categories
    const categoryConstruccion = await prisma.category.upsert({
        where: { name: "Construcción" },
        update: {},
        create: {
            name: "Construcción",
            description: "Materiales de construcción",
            color: "#dc2626",
            icon: "Hammer",
        },
    });

    const categoryFerreteria = await prisma.category.upsert({
        where: { name: "Ferretería" },
        update: {},
        create: {
            name: "Ferretería",
            description: "Herramientas y accesorios",
            color: "#f59e0b",
            icon: "Wrench",
        },
    });

    const categoryPinturas = await prisma.category.upsert({
        where: { name: "Pinturas" },
        update: {},
        create: {
            name: "Pinturas",
            description: "Pinturas y acabados",
            color: "#8b5cf6",
            icon: "Paintbrush",
        },
    });

    const categoryElectricidad = await prisma.category.upsert({
        where: { name: "Electricidad" },
        update: {},
        create: {
            name: "Electricidad",
            description: "Material eléctrico",
            color: "#eab308",
            icon: "Zap",
        },
    });

    const categoryPlomeria = await prisma.category.upsert({
        where: { name: "Plomería" },
        update: {},
        create: {
            name: "Plomería",
            description: "Tubos y accesorios",
            color: "#3b82f6",
            icon: "Droplets",
        },
    });

    console.log("✅ Created 5 categories");

    // Create products
    await prisma.product.upsert({
        where: { code: "CONST-001" },
        update: {},
        create: {
            code: "CONST-001",
            name: "Cemento Portland 42.5kg",
            description: "Cemento de alta resistencia para construcción",
            price: 32.50,
            cost: 25.00,
            stock: 150,
            minStock: 20,
            unit: "BOLSA",
            categoryId: categoryConstruccion.id,
        },
    });

    await prisma.product.upsert({
        where: { code: "CONST-002" },
        update: {},
        create: {
            code: "CONST-002",
            name: 'Fierro Corrugado 1/2"',
            description: 'Varilla de construcción de 1/2 pulgada x 9m',
            price: 45.00,
            cost: 35.00,
            stock: 200,
            minStock: 50,
            unit: "VARILLA",
            categoryId: categoryConstruccion.id,
        },
    });

    await prisma.product.upsert({
        where: { code: "FERR-001" },
        update: {},
        create: {
            code: "FERR-001",
            name: "Martillo de uña 16oz",
            description: "Martillo profesional con mango de fibra",
            price: 35.00,
            cost: 22.00,
            stock: 25,
            minStock: 5,
            unit: "UND",
            categoryId: categoryFerreteria.id,
        },
    });

    await prisma.product.upsert({
        where: { code: "PINT-001" },
        update: {},
        create: {
            code: "PINT-001",
            name: "Pintura Látex Blanco 4L",
            description: "Pintura látex lavable para interiores",
            price: 68.00,
            cost: 48.00,
            stock: 35,
            minStock: 15,
            unit: "GALÓN",
            categoryId: categoryPinturas.id,
        },
    });

    await prisma.product.upsert({
        where: { code: "ELEC-001" },
        update: {},
        create: {
            code: "ELEC-001",
            name: "Cable THW 14 AWG Rojo 100m",
            description: "Cable eléctrico para instalaciones",
            price: 185.00,
            cost: 140.00,
            stock: 15,
            minStock: 5,
            unit: "ROLLO",
            categoryId: categoryElectricidad.id,
        },
    });

    await prisma.product.upsert({
        where: { code: "PLOM-001" },
        update: {},
        create: {
            code: "PLOM-001",
            name: 'Tubo PVC 4" x 3m',
            description: "Tubo de desagüe para instalaciones sanitarias",
            price: 28.00,
            cost: 18.00,
            stock: 45,
            minStock: 30,
            unit: "UND",
            categoryId: categoryPlomeria.id,
        },
    });

    console.log("✅ Created 6 sample products");

    // Create sample clients
    await prisma.client.upsert({
        where: { document: "12345678" },
        update: {},
        create: {
            documentType: "DNI",
            document: "12345678",
            name: "Juan Carlos Pérez García",
            phone: "999111222",
            email: "juan.perez@email.com",
            address: "Av. Principal 123, Lima",
            segment: "FRECUENTE",
        },
    });

    await prisma.client.upsert({
        where: { document: "20123456789" },
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
        },
    });

    await prisma.client.upsert({
        where: { document: "87654321" },
        update: {},
        create: {
            documentType: "DNI",
            document: "87654321",
            name: "María Elena Rodríguez",
            phone: "999333444",
            segment: "REGULAR",
        },
    });

    console.log("✅ Created 3 sample clients");

    // Create settings
    await prisma.setting.upsert({
        where: { key: "company_name" },
        update: {},
        create: {
            key: "company_name",
            value: "Corporación Oropeza's E.I.R.L.",
            type: "string",
        },
    });

    await prisma.setting.upsert({
        where: { key: "igv_rate" },
        update: {},
        create: {
            key: "igv_rate",
            value: "0.18",
            type: "number",
        },
    });

    await prisma.setting.upsert({
        where: { key: "sale_counter" },
        update: {},
        create: {
            key: "sale_counter",
            value: "0",
            type: "number",
        },
    });

    console.log("✅ Created settings");
    console.log("🎉 Seeding completed!");
}

main()
    .then(async () => {
        await prisma.$disconnect();
        sqlite.close();
    })
    .catch(async (e) => {
        console.error(e);
        await prisma.$disconnect();
        sqlite.close();
        process.exit(1);
    });
