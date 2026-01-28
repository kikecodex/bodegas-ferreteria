import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

// POST /api/fix-admin - Reset admin password
export async function POST() {
    try {
        const hashedPassword = await bcrypt.hash("admin123", 12);

        // Update existing superadmin or create one
        const admin = await prisma.user.upsert({
            where: { email: "admin@sistema.com" },
            update: {
                password: hashedPassword,
                isActive: true
            },
            create: {
                email: "admin@sistema.com",
                name: "Super Administrador",
                password: hashedPassword,
                role: "SUPERADMIN",
                tenantId: null,
                isActive: true,
            }
        });

        return NextResponse.json({
            success: true,
            message: "Credenciales reseteadas",
            email: admin.email,
            password: "admin123"
        });
    } catch (error) {
        console.error("Error:", error);
        return NextResponse.json({ error: "Error" }, { status: 500 });
    }
}
