import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

// GET /api/seed-bodega-liz - Crear tenant Bodega Liz
export async function GET() {
    try {
        // Verificar si ya existe
        const existing = await prisma.tenant.findFirst({
            where: { slug: "bodega-liz" }
        });

        if (existing) {
            return NextResponse.json({
                message: "Bodega Liz ya existe",
                tenant: {
                    id: existing.id,
                    name: existing.name,
                    slug: existing.slug
                }
            });
        }

        // Hash de contraseña
        const hashedPassword = await bcrypt.hash("liz123", 10);

        // Calcular fecha de expiración (30 días)
        const planExpiresAt = new Date();
        planExpiresAt.setDate(planExpiresAt.getDate() + 30);

        // Crear tenant con usuario admin
        const tenant = await prisma.tenant.create({
            data: {
                name: "Bodega Liz",
                slug: "bodega-liz",
                ruc: "10123456789",
                tradeName: "Bodega Liz",
                phone: "999777888",
                email: "ventas@bodegaliz.com",
                address: "Jr. Los Pinos 456, Lima",
                logo: "/uploads/logos/bodega-liz.png",
                plan: "ACTIVO",
                isActive: true,
                planExpiresAt,
                users: {
                    create: {
                        email: "admin@bodegaliz.com",
                        password: hashedPassword,
                        name: "Liz",
                        role: "ADMIN"
                    }
                }
            },
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

        return NextResponse.json({
            success: true,
            message: "Bodega Liz creada exitosamente",
            tenant: {
                id: tenant.id,
                name: tenant.name,
                slug: tenant.slug,
                logo: tenant.logo,
                plan: tenant.plan,
                planExpiresAt: tenant.planExpiresAt
            },
            admin: {
                email: "admin@bodegaliz.com",
                password: "liz123"
            }
        }, { status: 201 });

    } catch (error) {
        console.error("Error creating Bodega Liz:", error);
        return NextResponse.json(
            { error: "Error al crear Bodega Liz", details: String(error) },
            { status: 500 }
        );
    }
}
