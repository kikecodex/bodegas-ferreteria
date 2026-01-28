import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

// POST /api/auth/register - Registrar nuevo negocio (tenant + admin)
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const {
            // Datos del negocio
            businessName,
            businessRuc,
            businessPhone,
            businessEmail,
            businessAddress,

            // Datos del usuario admin
            adminName,
            adminEmail,
            adminPassword
        } = body;

        // Validaciones
        if (!businessName || !adminName || !adminEmail || !adminPassword) {
            return NextResponse.json(
                { error: "Todos los campos obligatorios son requeridos" },
                { status: 400 }
            );
        }

        if (adminPassword.length < 6) {
            return NextResponse.json(
                { error: "La contraseña debe tener al menos 6 caracteres" },
                { status: 400 }
            );
        }

        // Generar slug único del negocio
        const baseSlug = businessName
            .toLowerCase()
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/^-|-$/g, "");

        // Verificar que el slug no exista
        let slug = baseSlug;
        let counter = 1;
        while (await prisma.tenant.findUnique({ where: { slug } })) {
            slug = `${baseSlug}-${counter}`;
            counter++;
        }

        // Verificar que el email del admin no exista
        const existingUser = await prisma.user.findUnique({
            where: { email: adminEmail }
        });

        if (existingUser) {
            return NextResponse.json(
                { error: "Ya existe un usuario con ese email" },
                { status: 409 }
            );
        }

        // Hash de la contraseña
        const hashedPassword = await bcrypt.hash(adminPassword, 12);

        // Calcular fecha de expiración del trial (7 días)
        const trialEndsAt = new Date();
        trialEndsAt.setDate(trialEndsAt.getDate() + 7);

        // Crear tenant y usuario admin en una transacción
        const result = await prisma.$transaction(async (tx) => {
            // 1. Crear el tenant
            const tenant = await tx.tenant.create({
                data: {
                    name: businessName.trim(),
                    slug,
                    ruc: businessRuc?.trim() || null,
                    phone: businessPhone?.trim() || null,
                    email: businessEmail?.trim() || null,
                    address: businessAddress?.trim() || null,
                    plan: "TRIAL",
                    trialEndsAt,
                    planExpiresAt: trialEndsAt,
                }
            });

            // 2. Crear el usuario admin del tenant
            const user = await tx.user.create({
                data: {
                    email: adminEmail.trim().toLowerCase(),
                    name: adminName.trim(),
                    password: hashedPassword,
                    role: "ADMIN",
                    tenantId: tenant.id,
                }
            });

            // 3. Crear categorías por defecto
            const defaultCategories = [
                { name: "General", color: "#6b7280", icon: "Package" },
                { name: "Herramientas", color: "#f59e0b", icon: "Wrench" },
                { name: "Materiales", color: "#3b82f6", icon: "Boxes" },
                { name: "Electricidad", color: "#eab308", icon: "Zap" },
            ];

            for (const cat of defaultCategories) {
                await tx.category.create({
                    data: {
                        ...cat,
                        tenantId: tenant.id,
                    }
                });
            }

            // 4. Crear configuraciones por defecto
            const defaultSettings = [
                { key: "business_name", value: businessName, type: "string" },
                { key: "tax_rate", value: "18", type: "number" },
                { key: "currency", value: "PEN", type: "string" },
            ];

            for (const setting of defaultSettings) {
                await tx.setting.create({
                    data: {
                        ...setting,
                        tenantId: tenant.id,
                    }
                });
            }

            return { tenant, user };
        });

        return NextResponse.json({
            success: true,
            message: "Negocio registrado exitosamente",
            tenant: {
                id: result.tenant.id,
                name: result.tenant.name,
                slug: result.tenant.slug,
                plan: result.tenant.plan,
                trialEndsAt: result.tenant.trialEndsAt,
            },
            user: {
                id: result.user.id,
                email: result.user.email,
                name: result.user.name,
            }
        }, { status: 201 });

    } catch (error) {
        console.error("Error registering business:", error);
        return NextResponse.json(
            { error: "Error al registrar el negocio" },
            { status: 500 }
        );
    }
}
