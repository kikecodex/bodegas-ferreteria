import { PrismaClient } from "@prisma/client";
import { PrismaNeon } from "@prisma/adapter-neon";

// Global for development hot-reload (prevents multiple instances)
const globalForPrisma = globalThis as unknown as {
    prisma: PrismaClient | undefined;
};

// Create PrismaClient with Neon adapter
// Lazy initialization to handle Vercel build time when DATABASE_URL may not be available
const createPrismaClient = (): PrismaClient => {
    const connectionString = process.env.DATABASE_URL;

    if (!connectionString) {
        // Durante el build de Vercel, creamos un cliente sin adapter
        // Esto permite que el build pase, pero las llamadas reales fallarán sin DATABASE_URL
        console.warn("DATABASE_URL not set - Prisma client may not work correctly");
        return new PrismaClient();
    }

    // Create adapter with connection string for Neon
    const adapter = new PrismaNeon({
        connectionString
    });

    return new PrismaClient({ adapter });
};

// Exportar prisma - se inicializa lazy cuando se usa
export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
    globalForPrisma.prisma = prisma;
}

export default prisma;

