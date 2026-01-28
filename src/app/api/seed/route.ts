import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

// GET /api/seed - Crear usuarios iniciales (para fácil acceso desde navegador)
export async function GET() {
    return createInitialUsers();
}

// POST /api/seed - Crear usuarios iniciales
export async function POST() {
    return createInitialUsers();
}

async function createInitialUsers() {
    try {
        const hashedPassword = await bcrypt.hash("admin123", 10);
        const results = [];

        // Crear admin
        const existingAdmin = await prisma.user.findUnique({
            where: { email: "admin@oropezas.com" }
        });

        if (!existingAdmin) {
            const admin = await prisma.user.create({
                data: {
                    email: "admin@oropezas.com",
                    name: "Administrador",
                    password: hashedPassword,
                    role: "ADMIN",
                    isActive: true
                }
            });
            results.push({ user: "admin", email: admin.email, status: "created" });
        } else {
            results.push({ user: "admin", email: existingAdmin.email, status: "already exists" });
        }

        // Crear vendedor
        const existingVendedor = await prisma.user.findUnique({
            where: { email: "vendedor@oropezas.com" }
        });

        if (!existingVendedor) {
            const vendedor = await prisma.user.create({
                data: {
                    email: "vendedor@oropezas.com",
                    name: "Juan Vendedor",
                    password: hashedPassword,
                    role: "VENDEDOR",
                    isActive: true
                }
            });
            results.push({ user: "vendedor", email: vendedor.email, status: "created" });
        } else {
            results.push({ user: "vendedor", email: existingVendedor.email, status: "already exists" });
        }

        return NextResponse.json({
            message: "Usuarios iniciales procesados",
            password: "admin123",
            users: results
        }, { status: 201 });
    } catch (error) {
        console.error("Error creating users:", error);
        return NextResponse.json(
            { error: "Error al crear usuarios", details: String(error) },
            { status: 500 }
        );
    }
}

