import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

// POST /api/seed - Crear usuario admin por defecto
// IMPORTANTE: Eliminar o proteger en producción
export async function POST() {
    try {
        // Verificar si ya existe admin
        const existingAdmin = await prisma.user.findUnique({
            where: { email: "admin@oropezas.com" }
        });

        if (existingAdmin) {
            return NextResponse.json({
                message: "Usuario admin ya existe",
                email: existingAdmin.email
            });
        }

        // Hash de contraseña
        const hashedPassword = await bcrypt.hash("admin123", 10);

        // Crear admin
        const admin = await prisma.user.create({
            data: {
                email: "admin@oropezas.com",
                name: "Administrador",
                password: hashedPassword,
                role: "ADMIN",
                isActive: true
            }
        });

        return NextResponse.json({
            message: "Usuario admin creado exitosamente",
            email: admin.email,
            password: "admin123",
            note: "Cambia la contraseña después del primer login"
        }, { status: 201 });
    } catch (error) {
        console.error("Error creating admin:", error);
        return NextResponse.json(
            { error: "Error al crear usuario admin" },
            { status: 500 }
        );
    }
}
