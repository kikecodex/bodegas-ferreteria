import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Categorías de ferretería/bodega
const categories = [
    { name: "Herramientas Manuales", color: "#3B82F6", icon: "Wrench" },
    { name: "Herramientas Eléctricas", color: "#EF4444", icon: "Zap" },
    { name: "Materiales de Construcción", color: "#F59E0B", icon: "Building" },
    { name: "Pinturas y Acabados", color: "#8B5CF6", icon: "Paintbrush" },
    { name: "Plomería", color: "#06B6D4", icon: "Droplet" },
    { name: "Electricidad", color: "#FBBF24", icon: "Lightbulb" },
    { name: "Ferretería General", color: "#6B7280", icon: "Package" },
    { name: "Cerrajería", color: "#10B981", icon: "Lock" },
    { name: "Jardinería", color: "#22C55E", icon: "Leaf" },
    { name: "Seguridad", color: "#DC2626", icon: "Shield" },
];

// Productos por categoría
const productsByCategory: Record<string, Array<{ code: string; name: string; price: number; cost: number; stock: number; minStock: number }>> = {
    "Herramientas Manuales": [
        { code: "HM001", name: "Martillo de Uña 16oz", price: 35.00, cost: 22.00, stock: 50, minStock: 10 },
        { code: "HM002", name: "Destornillador Plano 6\"", price: 12.00, cost: 7.00, stock: 100, minStock: 20 },
        { code: "HM003", name: "Destornillador Estrella 6\"", price: 12.00, cost: 7.00, stock: 100, minStock: 20 },
        { code: "HM004", name: "Alicate Universal 8\"", price: 28.00, cost: 18.00, stock: 60, minStock: 15 },
        { code: "HM005", name: "Llave Francesa 10\"", price: 45.00, cost: 28.00, stock: 30, minStock: 8 },
        { code: "HM006", name: "Juego de Llaves Allen (9 pzs)", price: 25.00, cost: 15.00, stock: 40, minStock: 10 },
        { code: "HM007", name: "Serrucho 22\"", price: 38.00, cost: 24.00, stock: 25, minStock: 5 },
        { code: "HM008", name: "Flexómetro 5m", price: 15.00, cost: 9.00, stock: 80, minStock: 20 },
        { code: "HM009", name: "Nivel de Aluminio 24\"", price: 55.00, cost: 35.00, stock: 20, minStock: 5 },
        { code: "HM010", name: "Espátula 4\"", price: 8.00, cost: 4.50, stock: 100, minStock: 25 },
    ],
    "Herramientas Eléctricas": [
        { code: "HE001", name: "Taladro Percutor 1/2\" 750W", price: 280.00, cost: 180.00, stock: 15, minStock: 3 },
        { code: "HE002", name: "Amoladora 4-1/2\" 850W", price: 195.00, cost: 125.00, stock: 20, minStock: 4 },
        { code: "HE003", name: "Caladora 500W", price: 165.00, cost: 105.00, stock: 12, minStock: 3 },
        { code: "HE004", name: "Lijadora Orbital", price: 145.00, cost: 90.00, stock: 10, minStock: 2 },
        { code: "HE005", name: "Rotomartillo SDS Plus", price: 450.00, cost: 290.00, stock: 8, minStock: 2 },
    ],
    "Materiales de Construcción": [
        { code: "MC001", name: "Cemento Portland 42.5kg", price: 32.50, cost: 26.00, stock: 200, minStock: 50 },
        { code: "MC002", name: "Fierro Corrugado 1/2\" x 9m", price: 45.00, cost: 38.00, stock: 150, minStock: 30 },
        { code: "MC003", name: "Fierro Corrugado 3/8\" x 9m", price: 28.00, cost: 22.00, stock: 200, minStock: 40 },
        { code: "MC004", name: "Alambre Negro N°16 (kg)", price: 8.00, cost: 6.00, stock: 100, minStock: 20 },
        { code: "MC005", name: "Clavos 2\" (kg)", price: 12.00, cost: 8.50, stock: 80, minStock: 15 },
        { code: "MC006", name: "Clavos 3\" (kg)", price: 12.00, cost: 8.50, stock: 80, minStock: 15 },
        { code: "MC007", name: "Ladrillo King Kong 18 huecos", price: 1.20, cost: 0.80, stock: 5000, minStock: 500 },
        { code: "MC008", name: "Arena Fina (m³)", price: 85.00, cost: 65.00, stock: 30, minStock: 5 },
        { code: "MC009", name: "Piedra Chancada 1/2\" (m³)", price: 95.00, cost: 75.00, stock: 25, minStock: 5 },
        { code: "MC010", name: "Yeso en Bolsa 25kg", price: 18.00, cost: 12.00, stock: 100, minStock: 20 },
    ],
    "Pinturas y Acabados": [
        { code: "PA001", name: "Pintura Látex Blanco 4L", price: 65.00, cost: 45.00, stock: 40, minStock: 10 },
        { code: "PA002", name: "Pintura Látex Blanco 20L", price: 280.00, cost: 195.00, stock: 20, minStock: 5 },
        { code: "PA003", name: "Esmalte Sintético Negro 1L", price: 48.00, cost: 32.00, stock: 30, minStock: 8 },
        { code: "PA004", name: "Thinner Acrílico 1L", price: 18.00, cost: 12.00, stock: 60, minStock: 15 },
        { code: "PA005", name: "Brocha 4\"", price: 15.00, cost: 9.00, stock: 50, minStock: 12 },
        { code: "PA006", name: "Rodillo 9\" con Mango", price: 22.00, cost: 14.00, stock: 40, minStock: 10 },
        { code: "PA007", name: "Lija al Agua N°100", price: 2.50, cost: 1.50, stock: 200, minStock: 50 },
        { code: "PA008", name: "Masilla para Madera 1kg", price: 25.00, cost: 16.00, stock: 30, minStock: 8 },
    ],
    "Plomería": [
        { code: "PL001", name: "Tubo PVC 1/2\" x 5m", price: 12.00, cost: 8.00, stock: 100, minStock: 20 },
        { code: "PL002", name: "Tubo PVC 3/4\" x 5m", price: 15.00, cost: 10.00, stock: 80, minStock: 15 },
        { code: "PL003", name: "Tubo PVC 4\" Desagüe x 3m", price: 35.00, cost: 24.00, stock: 50, minStock: 10 },
        { code: "PL004", name: "Codo PVC 1/2\" x 90°", price: 1.50, cost: 0.80, stock: 200, minStock: 50 },
        { code: "PL005", name: "Tee PVC 1/2\"", price: 2.00, cost: 1.20, stock: 150, minStock: 40 },
        { code: "PL006", name: "Llave de Paso 1/2\" Bronce", price: 28.00, cost: 18.00, stock: 40, minStock: 10 },
        { code: "PL007", name: "Cinta Teflón", price: 3.00, cost: 1.50, stock: 200, minStock: 50 },
        { code: "PL008", name: "Pegamento PVC 250ml", price: 22.00, cost: 14.00, stock: 50, minStock: 12 },
        { code: "PL009", name: "Trampa PVC 2\"", price: 8.00, cost: 5.00, stock: 60, minStock: 15 },
        { code: "PL010", name: "Válvula Check 1/2\"", price: 35.00, cost: 22.00, stock: 25, minStock: 6 },
    ],
    "Electricidad": [
        { code: "EL001", name: "Cable THW 14 AWG (m)", price: 2.80, cost: 1.80, stock: 500, minStock: 100 },
        { code: "EL002", name: "Cable THW 12 AWG (m)", price: 4.00, cost: 2.60, stock: 400, minStock: 80 },
        { code: "EL003", name: "Interruptor Simple", price: 8.00, cost: 5.00, stock: 100, minStock: 25 },
        { code: "EL004", name: "Interruptor Doble", price: 12.00, cost: 7.50, stock: 80, minStock: 20 },
        { code: "EL005", name: "Tomacorriente Doble", price: 10.00, cost: 6.00, stock: 100, minStock: 25 },
        { code: "EL006", name: "Foco LED 9W", price: 8.00, cost: 5.00, stock: 150, minStock: 30 },
        { code: "EL007", name: "Fluorescente LED 18W", price: 25.00, cost: 16.00, stock: 60, minStock: 15 },
        { code: "EL008", name: "Caja Rectangular PVC", price: 3.00, cost: 1.80, stock: 200, minStock: 50 },
        { code: "EL009", name: "Canaleta 20x10 x 2m", price: 8.00, cost: 5.00, stock: 80, minStock: 20 },
        { code: "EL010", name: "Cinta Aislante 3M", price: 6.00, cost: 3.50, stock: 150, minStock: 40 },
    ],
    "Ferretería General": [
        { code: "FG001", name: "Tornillo Autorroscante 1\" (100 pzs)", price: 15.00, cost: 9.00, stock: 80, minStock: 20 },
        { code: "FG002", name: "Tornillo para Madera 2\" (100 pzs)", price: 18.00, cost: 11.00, stock: 70, minStock: 18 },
        { code: "FG003", name: "Perno Hexagonal 1/4\" x 2\"", price: 1.00, cost: 0.60, stock: 300, minStock: 80 },
        { code: "FG004", name: "Tuerca Hexagonal 1/4\"", price: 0.30, cost: 0.15, stock: 500, minStock: 100 },
        { code: "FG005", name: "Arandela Plana 1/4\"", price: 0.20, cost: 0.10, stock: 500, minStock: 100 },
        { code: "FG006", name: "Bisagra 3\" x 3\" (par)", price: 8.00, cost: 5.00, stock: 100, minStock: 25 },
        { code: "FG007", name: "Cerrojo 4\"", price: 12.00, cost: 7.50, stock: 50, minStock: 12 },
        { code: "FG008", name: "Candado 40mm", price: 25.00, cost: 16.00, stock: 40, minStock: 10 },
        { code: "FG009", name: "Cadena Galvanizada 3/16\" (m)", price: 8.00, cost: 5.00, stock: 100, minStock: 20 },
        { code: "FG010", name: "Gancho S 2\"", price: 1.50, cost: 0.80, stock: 200, minStock: 50 },
    ],
    "Cerrajería": [
        { code: "CE001", name: "Chapa de Perilla", price: 45.00, cost: 28.00, stock: 30, minStock: 8 },
        { code: "CE002", name: "Chapa de Bola 3 Golpes", price: 85.00, cost: 55.00, stock: 20, minStock: 5 },
        { code: "CE003", name: "Cerradura de Sobreponer", price: 65.00, cost: 42.00, stock: 25, minStock: 6 },
        { code: "CE004", name: "Picaporte 3\"", price: 8.00, cost: 5.00, stock: 60, minStock: 15 },
        { code: "CE005", name: "Manija de Puerta Cromada", price: 35.00, cost: 22.00, stock: 20, minStock: 5 },
    ],
    "Jardinería": [
        { code: "JA001", name: "Manguera 1/2\" x 25m", price: 65.00, cost: 42.00, stock: 20, minStock: 5 },
        { code: "JA002", name: "Pistola de Riego", price: 25.00, cost: 16.00, stock: 30, minStock: 8 },
        { code: "JA003", name: "Rastrillo de Jardinería", price: 35.00, cost: 22.00, stock: 20, minStock: 5 },
        { code: "JA004", name: "Pala Cuchara", price: 45.00, cost: 28.00, stock: 25, minStock: 6 },
        { code: "JA005", name: "Tijera de Podar", price: 38.00, cost: 24.00, stock: 25, minStock: 6 },
    ],
    "Seguridad": [
        { code: "SE001", name: "Casco de Seguridad", price: 25.00, cost: 16.00, stock: 40, minStock: 10 },
        { code: "SE002", name: "Guantes de Cuero", price: 18.00, cost: 11.00, stock: 50, minStock: 12 },
        { code: "SE003", name: "Lentes de Seguridad", price: 12.00, cost: 7.00, stock: 60, minStock: 15 },
        { code: "SE004", name: "Zapatos de Seguridad", price: 95.00, cost: 62.00, stock: 20, minStock: 5 },
        { code: "SE005", name: "Mascarilla N95 (caja 20)", price: 45.00, cost: 28.00, stock: 30, minStock: 8 },
    ],
};

// POST /api/seed-products - Cargar productos de ferretería
export async function POST() {
    try {
        let totalProducts = 0;
        let totalCategories = 0;

        // Crear categorías
        for (const cat of categories) {
            const existing = await prisma.category.findFirst({
                where: { name: cat.name }
            });

            if (!existing) {
                await prisma.category.create({
                    data: {
                        name: cat.name,
                        description: `Productos de ${cat.name.toLowerCase()}`,
                        color: cat.color,
                        icon: cat.icon,
                        isActive: true
                    }
                });
                totalCategories++;
            }
        }

        // Crear productos
        for (const [categoryName, products] of Object.entries(productsByCategory)) {
            const category = await prisma.category.findFirst({
                where: { name: categoryName }
            });

            if (!category) continue;

            for (const prod of products) {
                const existing = await prisma.product.findFirst({
                    where: { code: prod.code }
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
                            isActive: true
                        }
                    });
                    totalProducts++;
                }
            }
        }

        return NextResponse.json({
            success: true,
            message: `Catálogo de ferretería cargado`,
            categorias: totalCategories,
            productos: totalProducts,
            nota: "Ve a /productos para editar precios y cantidades"
        }, { status: 201 });
    } catch (error) {
        console.error("Error seeding products:", error);
        return NextResponse.json(
            { error: "Error al cargar productos" },
            { status: 500 }
        );
    }
}
