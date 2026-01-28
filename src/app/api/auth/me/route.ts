import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/auth/me - Obtener usuario actual y su tenant
export async function GET(request: NextRequest) {
    try {
        const sessionToken = request.cookies.get("session-token")?.value;

        if (!sessionToken) {
            return NextResponse.json(
                { error: "No autenticado" },
                { status: 401 }
            );
        }

        // Buscar sesión válida con tenant
        const session = await prisma.session.findUnique({
            where: { sessionToken },
            include: {
                user: {
                    select: {
                        id: true,
                        email: true,
                        name: true,
                        role: true,
                        avatar: true,
                        phone: true,
                        isActive: true,
                        tenantId: true,
                        tenant: {
                            select: {
                                id: true,
                                name: true,
                                slug: true,
                                logo: true,
                                tradeName: true,
                                ruc: true,
                                phone: true,
                                email: true,
                                address: true,
                                plan: true,
                                planExpiresAt: true,
                                isActive: true
                            }
                        }
                    }
                }
            }
        });

        if (!session || session.expires < new Date()) {
            // Sesión expirada o no existe
            if (session) {
                await prisma.session.delete({ where: { id: session.id } });
            }

            const response = NextResponse.json(
                { error: "Sesión expirada" },
                { status: 401 }
            );
            response.cookies.set("session-token", "", { expires: new Date(0), path: "/" });
            return response;
        }

        if (!session.user.isActive) {
            return NextResponse.json(
                { error: "Usuario desactivado" },
                { status: 401 }
            );
        }

        // Extraer tenant del usuario
        const { tenant, ...userWithoutTenant } = session.user;

        return NextResponse.json({
            user: userWithoutTenant,
            tenant: tenant || null
        });
    } catch (error) {
        console.error("Error obteniendo usuario:", error);
        return NextResponse.json(
            { error: "Error de autenticación" },
            { status: 500 }
        );
    }
}

