import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

// GET /api/fix-bodega-liz - Verificar y corregir usuario de Bodega Liz
export async function GET() {
    try {
        // Buscar tenant
        const tenant = await prisma.tenant.findFirst({
            where: { slug: "bodega-liz" },
            include: {
                users: {
                    select: {
                        id: true,
                        email: true,
                        name: true,
                        role: true
                    }
                }
            }
        });

        if (!tenant) {
            return NextResponse.json({ error: "Bodega Liz no encontrada" }, { status: 404 });
        }

        // Verificar si tiene usuario admin
        const adminUser = tenant.users.find(u => u.role === "ADMIN");

        if (!adminUser) {
            // Crear usuario admin
            const hashedPassword = await bcrypt.hash("liz123", 10);

            const newUser = await prisma.user.create({
                data: {
                    email: "admin@bodegaliz.com",
                    password: hashedPassword,
                    name: "Liz",
                    role: "ADMIN",
                    tenantId: tenant.id
                }
            });

            return NextResponse.json({
                success: true,
                message: "Usuario admin creado para Bodega Liz",
                user: {
                    email: newUser.email,
                    name: newUser.name
                },
                credentials: {
                    email: "admin@bodegaliz.com",
                    password: "liz123"
                }
            });
        }

        // Usuario existe, resetear contraseña
        const hashedPassword = await bcrypt.hash("liz123", 10);

        await prisma.user.update({
            where: { id: adminUser.id },
            data: {
                password: hashedPassword,
                email: "admin@bodegaliz.com"
            }
        });

        // Actualizar nombre del tenant también
        await prisma.tenant.update({
            where: { id: tenant.id },
            data: {
                name: "Bodega Liz",
                plan: "ACTIVO",
                isActive: true,
                planExpiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
            }
        });

        return NextResponse.json({
            success: true,
            message: "Usuario de Bodega Liz corregido",
            tenant: {
                id: tenant.id,
                name: "Bodega Liz"
            },
            credentials: {
                email: "admin@bodegaliz.com",
                password: "liz123"
            }
        });

    } catch (error) {
        console.error("Error:", error);
        return NextResponse.json({ error: String(error) }, { status: 500 });
    }
}
