import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isSuperAdmin } from "@/lib/tenant-context";
import bcrypt from "bcryptjs";

// GET /api/admin/tenants - Listar todos los tenants (solo SuperAdmin)
export async function GET() {
    try {
        const isAdmin = await isSuperAdmin();

        if (!isAdmin) {
            return NextResponse.json(
                { error: "No autorizado" },
                { status: 403 }
            );
        }

        const tenants = await prisma.tenant.findMany({
            include: {
                _count: {
                    select: {
                        users: true,
                        products: true,
                        sales: true,
                    }
                }
            },
            orderBy: { createdAt: "desc" }
        });

        return NextResponse.json({ tenants });
    } catch (error) {
        console.error("Error fetching tenants:", error);
        return NextResponse.json(
            { error: "Error al obtener tenants" },
            { status: 500 }
        );
    }
}

// POST /api/admin/tenants - Crear nuevo tenant (solo SuperAdmin)
export async function POST(request: NextRequest) {
    try {
        const isAdmin = await isSuperAdmin();

        if (!isAdmin) {
            return NextResponse.json(
                { error: "No autorizado" },
                { status: 403 }
            );
        }

        const body = await request.json();
        const {
            name,
            slug,
            ruc,
            tradeName,
            phone,
            email,
            address,
            logo,
            plan = "TRIAL",
            adminEmail,
            adminPassword,
            adminName
        } = body;

        // Validaciones
        if (!name) {
            return NextResponse.json(
                { error: "El nombre es requerido" },
                { status: 400 }
            );
        }

        if (!adminEmail || !adminPassword) {
            return NextResponse.json(
                { error: "Email y contraseña del administrador son requeridos" },
                { status: 400 }
            );
        }

        // Generar slug si no se proporciona
        const tenantSlug = slug || name
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/^-|-$/g, "");

        // Verificar slug único
        const existingTenant = await prisma.tenant.findUnique({
            where: { slug: tenantSlug }
        });

        if (existingTenant) {
            return NextResponse.json(
                { error: "Ya existe un negocio con ese identificador" },
                { status: 400 }
            );
        }

        // Verificar email único
        const existingUser = await prisma.user.findUnique({
            where: { email: adminEmail }
        });

        if (existingUser) {
            return NextResponse.json(
                { error: "Ya existe un usuario con ese email" },
                { status: 400 }
            );
        }

        // Calcular fechas de trial
        const trialEndsAt = new Date();
        trialEndsAt.setDate(trialEndsAt.getDate() + 14); // 14 días de trial

        // Hash de contraseña
        const hashedPassword = await bcrypt.hash(adminPassword, 10);

        // Crear tenant con usuario admin
        const tenant = await prisma.tenant.create({
            data: {
                name,
                slug: tenantSlug,
                ruc,
                tradeName,
                phone,
                email,
                address,
                logo,
                plan,
                trialEndsAt: plan === "TRIAL" ? trialEndsAt : null,
                planExpiresAt: plan === "ACTIVO" ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) : null,
                users: {
                    create: {
                        email: adminEmail,
                        password: hashedPassword,
                        name: adminName || name,
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
                },
                _count: {
                    select: {
                        users: true,
                        products: true,
                        sales: true
                    }
                }
            }
        });

        return NextResponse.json({
            success: true,
            tenant,
            message: `Negocio "${name}" creado exitosamente`
        }, { status: 201 });

    } catch (error) {
        console.error("Error creating tenant:", error);
        return NextResponse.json(
            { error: "Error al crear tenant" },
            { status: 500 }
        );
    }
}
