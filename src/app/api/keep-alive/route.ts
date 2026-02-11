import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/keep-alive - Mantiene la conexión Neon activa para evitar cold starts
// Llamado por Vercel Cron cada 4 minutos (o servicio externo)
export async function GET() {
    try {
        const start = Date.now();
        // Query mínimo para despertar la conexión
        await prisma.$queryRawUnsafe("SELECT 1");
        const latencyMs = Date.now() - start;

        return NextResponse.json({
            status: "alive",
            latencyMs,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error("Keep-alive failed:", error);
        return NextResponse.json(
            { status: "error", error: String(error) },
            { status: 500 }
        );
    }
}
