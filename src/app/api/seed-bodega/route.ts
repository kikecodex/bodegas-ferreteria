import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Categorías de bodega/abarrotes
const categories = [
    { name: "Abarrotes", color: "#F59E0B", icon: "Package" },
    { name: "Bebidas", color: "#3B82F6", icon: "GlassWater" },
    { name: "Lácteos y Huevos", color: "#FBBF24", icon: "Milk" },
    { name: "Embutidos y Carnes", color: "#EF4444", icon: "Beef" },
    { name: "Panadería", color: "#D97706", icon: "Croissant" },
    { name: "Snacks y Golosinas", color: "#EC4899", icon: "Cookie" },
    { name: "Limpieza del Hogar", color: "#06B6D4", icon: "Sparkles" },
    { name: "Cuidado Personal", color: "#8B5CF6", icon: "Heart" },
    { name: "Frutas y Verduras", color: "#22C55E", icon: "Apple" },
    { name: "Licores", color: "#7C3AED", icon: "Wine" },
];

// Productos por categoría
const productsByCategory: Record<string, Array<{ code: string; name: string; price: number; cost: number; stock: number; minStock: number }>> = {
    "Abarrotes": [
        { code: "AB001", name: "Arroz Extra 1kg", price: 4.50, cost: 3.50, stock: 200, minStock: 50 },
        { code: "AB002", name: "Arroz Extra 5kg", price: 22.00, cost: 18.00, stock: 80, minStock: 20 },
        { code: "AB003", name: "Azúcar Rubia 1kg", price: 4.00, cost: 3.20, stock: 150, minStock: 40 },
        { code: "AB004", name: "Azúcar Blanca 1kg", price: 4.50, cost: 3.50, stock: 120, minStock: 30 },
        { code: "AB005", name: "Aceite Vegetal 1L", price: 9.50, cost: 7.50, stock: 100, minStock: 25 },
        { code: "AB006", name: "Aceite de Oliva 500ml", price: 28.00, cost: 22.00, stock: 30, minStock: 8 },
        { code: "AB007", name: "Sal de Mesa 1kg", price: 2.00, cost: 1.20, stock: 100, minStock: 25 },
        { code: "AB008", name: "Fideos Spaghetti 500g", price: 3.50, cost: 2.50, stock: 150, minStock: 40 },
        { code: "AB009", name: "Fideos Tallarín 500g", price: 3.50, cost: 2.50, stock: 120, minStock: 35 },
        { code: "AB010", name: "Fideos Cabello de Ángel 250g", price: 2.50, cost: 1.80, stock: 100, minStock: 25 },
        { code: "AB011", name: "Atún en Lata 170g", price: 6.50, cost: 5.00, stock: 80, minStock: 20 },
        { code: "AB012", name: "Sardina en Lata", price: 4.00, cost: 3.00, stock: 60, minStock: 15 },
        { code: "AB013", name: "Leche Evaporada 400g", price: 4.50, cost: 3.50, stock: 200, minStock: 50 },
        { code: "AB014", name: "Leche Condensada 393g", price: 6.00, cost: 4.50, stock: 80, minStock: 20 },
        { code: "AB015", name: "Avena Quaker 300g", price: 5.50, cost: 4.20, stock: 60, minStock: 15 },
        { code: "AB016", name: "Lentejas 500g", price: 4.50, cost: 3.30, stock: 80, minStock: 20 },
        { code: "AB017", name: "Frejoles 500g", price: 5.00, cost: 3.80, stock: 70, minStock: 18 },
        { code: "AB018", name: "Café Instantáneo 50g", price: 8.00, cost: 6.00, stock: 50, minStock: 12 },
        { code: "AB019", name: "Té Filtrante (caja 25)", price: 3.50, cost: 2.50, stock: 80, minStock: 20 },
        { code: "AB020", name: "Milo 400g", price: 16.00, cost: 12.50, stock: 40, minStock: 10 },
    ],
    "Bebidas": [
        { code: "BE001", name: "Agua Mineral Sin Gas 625ml", price: 2.00, cost: 1.20, stock: 200, minStock: 50 },
        { code: "BE002", name: "Agua Mineral Con Gas 625ml", price: 2.50, cost: 1.50, stock: 100, minStock: 25 },
        { code: "BE003", name: "Gaseosa Cola 500ml", price: 3.00, cost: 2.00, stock: 150, minStock: 40 },
        { code: "BE004", name: "Gaseosa Cola 1.5L", price: 6.50, cost: 5.00, stock: 80, minStock: 20 },
        { code: "BE005", name: "Gaseosa Cola 3L", price: 12.00, cost: 9.50, stock: 50, minStock: 12 },
        { code: "BE006", name: "Inca Kola 500ml", price: 3.00, cost: 2.00, stock: 150, minStock: 40 },
        { code: "BE007", name: "Inca Kola 1.5L", price: 6.50, cost: 5.00, stock: 80, minStock: 20 },
        { code: "BE008", name: "Sprite 500ml", price: 3.00, cost: 2.00, stock: 100, minStock: 25 },
        { code: "BE009", name: "Fanta 500ml", price: 3.00, cost: 2.00, stock: 100, minStock: 25 },
        { code: "BE010", name: "Frugos del Valle 1L", price: 5.50, cost: 4.00, stock: 60, minStock: 15 },
        { code: "BE011", name: "Cifrut 500ml", price: 2.50, cost: 1.60, stock: 120, minStock: 30 },
        { code: "BE012", name: "Gatorade 500ml", price: 4.50, cost: 3.20, stock: 80, minStock: 20 },
        { code: "BE013", name: "Powerade 500ml", price: 4.50, cost: 3.20, stock: 80, minStock: 20 },
        { code: "BE014", name: "Red Bull 250ml", price: 8.00, cost: 6.00, stock: 40, minStock: 10 },
        { code: "BE015", name: "Volt 300ml", price: 4.00, cost: 2.80, stock: 60, minStock: 15 },
    ],
    "Lácteos y Huevos": [
        { code: "LA001", name: "Leche Fresca 1L", price: 5.50, cost: 4.20, stock: 80, minStock: 20 },
        { code: "LA002", name: "Yogurt Gloria 1L", price: 8.50, cost: 6.50, stock: 50, minStock: 12 },
        { code: "LA003", name: "Yogurt Bebible 180g", price: 2.50, cost: 1.80, stock: 100, minStock: 25 },
        { code: "LA004", name: "Mantequilla 200g", price: 9.00, cost: 7.00, stock: 40, minStock: 10 },
        { code: "LA005", name: "Queso Fresco (kg)", price: 22.00, cost: 17.00, stock: 20, minStock: 5 },
        { code: "LA006", name: "Queso Edam 200g", price: 12.00, cost: 9.00, stock: 30, minStock: 8 },
        { code: "LA007", name: "Huevos (docena)", price: 9.00, cost: 7.00, stock: 80, minStock: 20 },
        { code: "LA008", name: "Huevos (media docena)", price: 5.00, cost: 3.80, stock: 60, minStock: 15 },
        { code: "LA009", name: "Crema de Leche 200ml", price: 5.50, cost: 4.00, stock: 40, minStock: 10 },
        { code: "LA010", name: "Manjar Blanco 500g", price: 12.00, cost: 9.00, stock: 30, minStock: 8 },
    ],
    "Embutidos y Carnes": [
        { code: "EM001", name: "Jamón del País 100g", price: 6.00, cost: 4.50, stock: 40, minStock: 10 },
        { code: "EM002", name: "Jamón Inglés 100g", price: 7.00, cost: 5.50, stock: 35, minStock: 8 },
        { code: "EM003", name: "Hot Dog (paquete 8)", price: 8.00, cost: 6.00, stock: 50, minStock: 12 },
        { code: "EM004", name: "Jamonada 100g", price: 4.00, cost: 3.00, stock: 60, minStock: 15 },
        { code: "EM005", name: "Chorizo Parrillero (kg)", price: 28.00, cost: 22.00, stock: 20, minStock: 5 },
        { code: "EM006", name: "Salchicha Huachana (kg)", price: 25.00, cost: 19.00, stock: 25, minStock: 6 },
        { code: "EM007", name: "Tocino 200g", price: 14.00, cost: 10.50, stock: 30, minStock: 8 },
    ],
    "Panadería": [
        { code: "PA001", name: "Pan Francés (unidad)", price: 0.30, cost: 0.20, stock: 500, minStock: 100 },
        { code: "PA002", name: "Pan Ciabatta (unidad)", price: 0.50, cost: 0.35, stock: 200, minStock: 50 },
        { code: "PA003", name: "Pan Integral (bolsa 6)", price: 5.00, cost: 3.80, stock: 40, minStock: 10 },
        { code: "PA004", name: "Pan de Molde Blanco", price: 7.00, cost: 5.50, stock: 50, minStock: 12 },
        { code: "PA005", name: "Pan de Molde Integral", price: 8.00, cost: 6.00, stock: 40, minStock: 10 },
        { code: "PA006", name: "Bizcocho (unidad)", price: 1.00, cost: 0.70, stock: 100, minStock: 25 },
        { code: "PA007", name: "Empanada de Carne", price: 2.50, cost: 1.80, stock: 60, minStock: 15 },
        { code: "PA008", name: "Croissant (unidad)", price: 2.00, cost: 1.40, stock: 80, minStock: 20 },
    ],
    "Snacks y Golosinas": [
        { code: "SN001", name: "Papas Lays Clásicas 80g", price: 4.00, cost: 3.00, stock: 100, minStock: 25 },
        { code: "SN002", name: "Doritos 85g", price: 4.50, cost: 3.30, stock: 80, minStock: 20 },
        { code: "SN003", name: "Cheetos 75g", price: 3.50, cost: 2.50, stock: 80, minStock: 20 },
        { code: "SN004", name: "Cuates 50g", price: 2.00, cost: 1.40, stock: 120, minStock: 30 },
        { code: "SN005", name: "Chocolate Sublime", price: 2.50, cost: 1.80, stock: 150, minStock: 40 },
        { code: "SN006", name: "Chocolate Princesa", price: 2.00, cost: 1.40, stock: 120, minStock: 30 },
        { code: "SN007", name: "Galletas Oreo", price: 3.50, cost: 2.60, stock: 80, minStock: 20 },
        { code: "SN008", name: "Galletas Soda (paquete)", price: 2.00, cost: 1.40, stock: 100, minStock: 25 },
        { code: "SN009", name: "Galletas Casino", price: 1.50, cost: 1.00, stock: 150, minStock: 40 },
        { code: "SN010", name: "Chicle Trident (unidad)", price: 0.50, cost: 0.30, stock: 300, minStock: 80 },
        { code: "SN011", name: "Caramelos Halls (unidad)", price: 0.30, cost: 0.15, stock: 400, minStock: 100 },
        { code: "SN012", name: "Chupetín (unidad)", price: 0.50, cost: 0.30, stock: 300, minStock: 80 },
    ],
    "Limpieza del Hogar": [
        { code: "LH001", name: "Detergente Ace 500g", price: 6.00, cost: 4.50, stock: 80, minStock: 20 },
        { code: "LH002", name: "Detergente Ariel 400g", price: 8.00, cost: 6.00, stock: 60, minStock: 15 },
        { code: "LH003", name: "Jabón Bolívar Barra", price: 3.50, cost: 2.50, stock: 100, minStock: 25 },
        { code: "LH004", name: "Lejía 1L", price: 4.00, cost: 2.80, stock: 80, minStock: 20 },
        { code: "LH005", name: "Limpiador Sapolio 900ml", price: 8.00, cost: 6.00, stock: 50, minStock: 12 },
        { code: "LH006", name: "Lavavajillas Ayudín 500g", price: 5.50, cost: 4.00, stock: 60, minStock: 15 },
        { code: "LH007", name: "Esponja Scotch-Brite", price: 3.00, cost: 2.00, stock: 80, minStock: 20 },
        { code: "LH008", name: "Papel Higiénico (x4)", price: 8.00, cost: 6.00, stock: 100, minStock: 25 },
        { code: "LH009", name: "Papel Toalla (rollo)", price: 5.00, cost: 3.50, stock: 60, minStock: 15 },
        { code: "LH010", name: "Bolsa de Basura (x10)", price: 4.00, cost: 2.80, stock: 80, minStock: 20 },
    ],
    "Cuidado Personal": [
        { code: "CP001", name: "Jabón Protex 3 pack", price: 9.00, cost: 7.00, stock: 50, minStock: 12 },
        { code: "CP002", name: "Shampoo Head & Shoulders 400ml", price: 22.00, cost: 17.00, stock: 30, minStock: 8 },
        { code: "CP003", name: "Pasta Dental Colgate 75ml", price: 5.00, cost: 3.50, stock: 80, minStock: 20 },
        { code: "CP004", name: "Cepillo Dental Colgate", price: 4.50, cost: 3.00, stock: 60, minStock: 15 },
        { code: "CP005", name: "Desodorante Rexona 150ml", price: 12.00, cost: 9.00, stock: 40, minStock: 10 },
        { code: "CP006", name: "Toallas Higiénicas Nosotras (x10)", price: 7.00, cost: 5.00, stock: 50, minStock: 12 },
        { code: "CP007", name: "Pañales Huggies (x20)", price: 35.00, cost: 27.00, stock: 25, minStock: 6 },
        { code: "CP008", name: "Papel Higiénico Elite (x6)", price: 14.00, cost: 10.50, stock: 40, minStock: 10 },
        { code: "CP009", name: "Crema Nivea 150ml", price: 18.00, cost: 14.00, stock: 30, minStock: 8 },
        { code: "CP010", name: "Alcohol 70° 500ml", price: 8.00, cost: 6.00, stock: 60, minStock: 15 },
    ],
    "Frutas y Verduras": [
        { code: "FV001", name: "Papa Blanca (kg)", price: 3.50, cost: 2.50, stock: 100, minStock: 25 },
        { code: "FV002", name: "Cebolla Roja (kg)", price: 4.00, cost: 3.00, stock: 80, minStock: 20 },
        { code: "FV003", name: "Tomate (kg)", price: 5.00, cost: 3.80, stock: 60, minStock: 15 },
        { code: "FV004", name: "Ajo (unidad)", price: 1.00, cost: 0.60, stock: 150, minStock: 40 },
        { code: "FV005", name: "Limón (kg)", price: 6.00, cost: 4.50, stock: 50, minStock: 12 },
        { code: "FV006", name: "Plátano de Seda (mano)", price: 3.00, cost: 2.20, stock: 80, minStock: 20 },
        { code: "FV007", name: "Manzana Nacional (kg)", price: 6.00, cost: 4.50, stock: 40, minStock: 10 },
        { code: "FV008", name: "Naranja (kg)", price: 4.00, cost: 3.00, stock: 50, minStock: 12 },
        { code: "FV009", name: "Zanahoria (kg)", price: 3.00, cost: 2.20, stock: 60, minStock: 15 },
        { code: "FV010", name: "Lechuga (unidad)", price: 2.50, cost: 1.80, stock: 40, minStock: 10 },
    ],
    "Licores": [
        { code: "LI001", name: "Cerveza Pilsen 620ml", price: 6.00, cost: 4.50, stock: 100, minStock: 25 },
        { code: "LI002", name: "Cerveza Cusqueña 620ml", price: 7.00, cost: 5.50, stock: 80, minStock: 20 },
        { code: "LI003", name: "Cerveza Corona 355ml", price: 6.50, cost: 5.00, stock: 60, minStock: 15 },
        { code: "LI004", name: "Six Pack Pilsen", price: 32.00, cost: 25.00, stock: 40, minStock: 10 },
        { code: "LI005", name: "Pisco Quebranta 700ml", price: 45.00, cost: 35.00, stock: 20, minStock: 5 },
        { code: "LI006", name: "Ron Cartavio 750ml", price: 35.00, cost: 27.00, stock: 25, minStock: 6 },
        { code: "LI007", name: "Vino Tinto Tabernero 750ml", price: 25.00, cost: 19.00, stock: 30, minStock: 8 },
        { code: "LI008", name: "Vino Blanco Tacama 750ml", price: 28.00, cost: 22.00, stock: 25, minStock: 6 },
        { code: "LI009", name: "Whisky Johnnie Walker Red 750ml", price: 85.00, cost: 68.00, stock: 15, minStock: 4 },
        { code: "LI010", name: "Vodka Smirnoff 750ml", price: 55.00, cost: 42.00, stock: 20, minStock: 5 },
    ],
};

// POST /api/seed-bodega - Cargar productos de bodega/abarrotes
export async function POST() {
    try {
        let totalProducts = 0;
        let totalCategories = 0;

        // Get tenant by slug
        const tenant = await prisma.tenant.findFirst({
            where: { slug: "oropezas-demo" }
        });

        if (!tenant) {
            return NextResponse.json(
                { error: "No existe el tenant. Ejecuta primero /api/fix-tenant" },
                { status: 400 }
            );
        }

        // Crear categorías
        for (const cat of categories) {
            const existing = await prisma.category.findFirst({
                where: { name: cat.name, tenantId: tenant.id }
            });

            if (!existing) {
                await prisma.category.create({
                    data: {
                        name: cat.name,
                        description: `Productos de ${cat.name.toLowerCase()}`,
                        color: cat.color,
                        icon: cat.icon,
                        isActive: true,
                        tenantId: tenant.id
                    }
                });
                totalCategories++;
            }
        }

        // Crear productos
        for (const [categoryName, products] of Object.entries(productsByCategory)) {
            const category = await prisma.category.findFirst({
                where: { name: categoryName, tenantId: tenant.id }
            });

            if (!category) continue;

            for (const prod of products) {
                const existing = await prisma.product.findFirst({
                    where: { code: prod.code, tenantId: tenant.id }
                });

                if (!existing) {
                    await prisma.product.create({
                        data: {
                            code: prod.code,
                            name: prod.name,
                            description: `${prod.name} - ${categoryName}`,
                            price: prod.price,
                            cost: prod.cost,
                            stock: prod.stock,
                            minStock: prod.minStock,
                            categoryId: category.id,
                            isActive: true,
                            tenantId: tenant.id
                        }
                    });
                    totalProducts++;
                }
            }
        }

        return NextResponse.json({
            success: true,
            message: `Catálogo de bodega/abarrotes cargado`,
            categorias: totalCategories,
            productos: totalProducts,
            nota: "Ve a /productos para editar precios y cantidades"
        }, { status: 201 });
    } catch (error) {
        console.error("Error seeding bodega products:", error);
        return NextResponse.json(
            { error: "Error al cargar productos de bodega" },
            { status: 500 }
        );
    }
}
