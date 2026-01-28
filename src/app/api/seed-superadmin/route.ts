import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

// POST /api/seed-superadmin - Crear usuario SuperAdmin
export async function POST() {
    try {
        // Verificar si ya existe un superadmin
        const existing = await prisma.user.findFirst({
            where: { role: "SUPERADMIN" }
        });

        if (existing) {
            return NextResponse.json({
                message: "SuperAdmin ya existe",
                email: existing.email
            });
        }

        // Crear SuperAdmin (sin tenant)
        const hashedPassword = await bcrypt.hash("admin123", 12);

        const superAdmin = await prisma.user.create({
            data: {
                email: "admin@sistema.com",
                name: "Super Administrador",
                password: hashedPassword,
                role: "SUPERADMIN",
                tenantId: null, // Sin tenant = acceso a todos
            }
        });

        return NextResponse.json({
            success: true,
            message: "SuperAdmin creado exitosamente",
            email: superAdmin.email,
            password: "admin123 (cámbiala después)"
        }, { status: 201 });
    } catch (error) {
        console.error("Error creating superadmin:", error);
        return NextResponse.json(
            { error: "Error al crear superadmin" },
            { status: 500 }
        );
    }
}
